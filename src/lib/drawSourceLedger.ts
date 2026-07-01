import type { DrawLedgerRow } from './drawLedger';

export type SourceEventStatus =
  | 'new'
  | 'needs_review'
  | 'open_committed'
  | 'paid_proof_found'
  | 'quote_only'
  | 'excluded'
  | 'draw_ready'
  | 'submitted'
  | 'funded'
  | 'not_submitted'
  | 'next_draw_draft';

export type SourceLedgerExceptionCode =
  | 'submitted_missing_derek_source'
  | 'funded_missing_submitted_draw'
  | 'funded_missing_funding_evidence'
  | 'draw_packet_total_mismatch'
  | 'quote_or_open_without_payment_proof'
  | 'next_draw_draft_not_submitted'
  | 'stale_submitted_metadata'
  | 'duplicate_draw_membership'
  | 'known_not_submitted_item'
  | 'needs_payment_proof';

export interface SourceLedgerException {
  code: SourceLedgerExceptionCode;
  severity: 'error' | 'warning' | 'info';
  ledgerId: string;
  message: string;
}

export interface DrawPacketRecord {
  drawPacketId: string;
  drawNumber: string;
  sentDate: string;
  derekThreadId: string;
  derekMessageId: string;
  grossRequestedAmount: number;
  expectedFundedAmount: number;
  fundedAmount: number;
  fundedDate: string;
  childItemIds: string[];
  sourceEvidence: string;
  totalChildAmount: number;
  totalMatchesGross: boolean;
}

export interface FundingRecord {
  fundingId: string;
  drawPacketId: string;
  fundedAmount: number;
  fundedDate: string;
  sourceEvidence: string;
}

export interface InvoiceReceiptRecord {
  ledgerId: string;
  vendorPayee: string;
  amount: number;
  status: SourceEventStatus;
  drawPacketId: string;
  statusEvidence: string;
}

export interface SourceEventLedger {
  invoiceReceiptLedger: InvoiceReceiptRecord[];
  drawPackets: DrawPacketRecord[];
  fundingRecords: FundingRecord[];
  exceptions: SourceLedgerException[];
  warnings: string[];
}

const MONEY_TOLERANCE = 1;

const KNOWN_NOT_SUBMITTED_RE =
  /not_submitted|not\s+submitted|missing_payment_proof|placeholder_only|next_draw_draft_not_submitted|next\s+draw\s+draft/i;
const PAYMENT_PROOF_RE = /paid|payment|check\s+written|receipt|invoice|visa|qbo|bank/i;
const OPEN_OR_QUOTE_RE = /quote|quoted|bid|placeholder|open\s+committed|unpaid|not\s+paid|support only/i;
const NEXT_DRAW_DRAFT_RE = /next[_\s-]*draw[_\s-]*draft|include in next draw|included in next draw draft/i;
const SUBMITTED_RE = /submitted\s+to\s+(derek|lender)|covered\s+by\s+draw|draw\s+packet\s+sent|do\s+not\s+submit\s+again/i;
const FUNDED_RE = /funded|funds?\s+released|draw\s+funded|available\s+in\s+savings/i;
const SUPPORT_ONLY_FUNDING_RE = /support[-\s]*only|amount\s+intentionally\s+zero|funding[_\s-]*allocated[_\s-]*support[_\s-]*only|funding[_\s-]*packet[_\s-]*backup[_\s-]*only/i;

export function extractGmailThreadId(text: string): string {
  const explicit = text.match(/gmail\s+thread\s*(?:id)?\s*[:#]?\s*([a-z0-9]{12,})/i);
  if (explicit) return explicit[1];
  const url = text.match(/mail\.google\.com\/mail\/[^\s#]*#(?:inbox|sent|all|search)\/([a-z0-9]{12,})/i);
  if (url) return url[1];
  return '';
}

export function extractGmailMessageId(text: string): string {
  const explicit = text.match(/(?:gmail\s+)?message\s*(?:id)?\s*[:#]?\s*([a-z0-9]{12,})/i);
  if (explicit) return explicit[1];
  const url = text.match(/mail\.google\.com\/mail\/[^\s#]*#(?:inbox|sent|all|search)\/([a-z0-9]{12,})/i);
  if (url) return url[1];
  return '';
}

export function drawNumberFromText(text: string): string {
  const m = text.match(/draw\s*#?\s*(\d+)/i) || text.match(/draw(\d+)/i);
  return m ? m[1] : '';
}

function rowHaystack(r: DrawLedgerRow): string {
  return [
    r.ledgerId,
    r.vendorPayee,
    r.docType,
    r.drawStatus,
    r.drawRequest,
    r.sourceLink,
    r.sourceEvidence,
    r.duplicateRule,
    r.notes,
    r.sourceCostTrackerId,
  ]
    .filter(Boolean)
    .join('\n');
}

function hasDerekSubmissionSource(r: DrawLedgerRow, packet?: DrawPacketRecord): boolean {
  // Child items inherit the submitted date/evidence from their parent draw packet.
  // Requiring each child row to duplicate submittedDate caused valid packet-backed
  // rows to downgrade even when the packet has Derek Gmail thread/message/date evidence.
  if (packet?.derekThreadId && packet?.derekMessageId && packet.sentDate) return true;
  const hay = rowHaystack(r);
  return !!r.submittedDate && !!extractGmailThreadId(hay) && !!extractGmailMessageId(hay);
}

function sourceEvidenceSentence(r: DrawLedgerRow, packet?: DrawPacketRecord): string {
  if (packet?.derekMessageId) {
    return `Submitted via Draw #${packet.drawNumber} — Gmail message ${packet.derekMessageId} — ${packet.sentDate}`;
  }
  if (NEXT_DRAW_DRAFT_RE.test(rowHaystack(r))) return 'Next draw draft only — no Derek submission found';
  if (KNOWN_NOT_SUBMITTED_RE.test(rowHaystack(r))) return r.duplicateRule || 'Not submitted — source evidence missing';
  if (OPEN_OR_QUOTE_RE.test(rowHaystack(r)) && !PAYMENT_PROOF_RE.test(r.drawStatus)) return 'Not submitted — missing payment proof';
  return r.sourceEvidence || r.sourceLink || r.notes || 'No source evidence attached';
}

function findPacketForRow(r: DrawLedgerRow, packets: DrawPacketRecord[]): DrawPacketRecord | undefined {
  const hay = rowHaystack(r);
  if (SUPPORT_ONLY_FUNDING_RE.test(hay) && r.amount === 0 && r.fundedAmount === 0 && !/packet:gross|draw(?:\s+request)?\s+packet|cover email/i.test(hay)) return undefined;
  if (KNOWN_NOT_SUBMITTED_RE.test(hay)) return undefined;
  const n = drawNumberFromText(hay);
  if (n) {
    const byNumber = packets.find((p) => p.drawNumber === n);
    if (byNumber) return byNumber;
  }
  return undefined;
}

function normalizeInvoiceStatus(r: DrawLedgerRow, packet?: DrawPacketRecord): SourceEventStatus {
  const hay = rowHaystack(r);
  if (KNOWN_NOT_SUBMITTED_RE.test(hay)) {
    if (NEXT_DRAW_DRAFT_RE.test(hay)) return 'next_draw_draft';
    return 'not_submitted';
  }
  if (SUPPORT_ONLY_FUNDING_RE.test(hay) && r.amount === 0 && r.fundedAmount === 0 && !/packet:gross|draw(?:\s+request)?\s+packet|cover email/i.test(hay)) return 'excluded';
  if (/excluded|not homestead|repair-maintenance/i.test(hay)) return 'excluded';
  // Historical draw-packet rows (Draw #1/#2) can be source-clean funded rows
  // when they carry their own Derek Gmail submission/funding evidence and do
  // not have child receipt rows that would already carry the reimbursed total.
  // Draw #3's packet row has child rows, so keep that packet as submitted-only
  // and let the children carry the funded bucket to avoid double counting.
  if (r.fundedAmount > 0 && packet && packet.childItemIds.length === 0 && hasDerekSubmissionSource(r, packet)) return 'funded';
  if (r.fundedAmount > 0 && packet) return 'funded';
  if (r.fundedAmount > 0 && !packet) return 'needs_review';
  if (hasDerekSubmissionSource(r, packet)) return 'submitted';
  if (r.submittedToDerek && !hasDerekSubmissionSource(r, packet)) return 'needs_review';
  if (r.readyForDraw || NEXT_DRAW_DRAFT_RE.test(hay)) return 'draw_ready';
  if (/paid|receipt-backed|receipt backed|visa/i.test(hay)) return 'paid_proof_found';
  if (/quote/i.test(hay)) return 'quote_only';
  if (/open|committed|bid|placeholder|unpaid/i.test(hay)) return 'open_committed';
  return 'needs_review';
}

export function buildSourceEventLedger(rows: DrawLedgerRow[]): SourceEventLedger {
  const exceptions: SourceLedgerException[] = [];

  const packetRows = rows.filter((r) => /packet:gross/i.test(r.ledgerId) || /draw(?:\s+request)?\s+packet|cover email/i.test(r.docType));
  const drawPackets: DrawPacketRecord[] = packetRows.map((r) => {
    const hay = rowHaystack(r);
    const drawNumber = drawNumberFromText(hay) || drawNumberFromText(r.ledgerId) || r.drawRequest || 'unknown';
    const derekThreadId = extractGmailThreadId(hay);
    const derekMessageId = extractGmailMessageId(hay);
    const childItemIds = rows
      .filter((child) => {
        const childHay = rowHaystack(child);
        return child.ledgerId !== r.ledgerId
          && !KNOWN_NOT_SUBMITTED_RE.test(childHay)
          && !SUPPORT_ONLY_FUNDING_RE.test(childHay)
          && drawNumberFromText(childHay) === drawNumber;
      })
      .map((child) => child.ledgerId);
    const totalChildAmount = rows
      .filter((child) => childItemIds.includes(child.ledgerId))
      .reduce((s, child) => s + child.amount, 0);
    return {
      drawPacketId: `draw-${drawNumber}`,
      drawNumber,
      sentDate: r.submittedDate || r.docDate,
      derekThreadId,
      derekMessageId,
      grossRequestedAmount: r.grossSubmittedAmount || r.amount,
      expectedFundedAmount: r.expectedFundedAmount,
      fundedAmount: r.fundedAmount,
      fundedDate: r.fundedDate,
      childItemIds,
      sourceEvidence: derekMessageId
        ? `Submitted via Draw #${drawNumber} — Gmail message ${derekMessageId} — ${r.submittedDate || r.docDate}`
        : sourceEvidenceSentence(r),
      totalChildAmount,
      totalMatchesGross: Math.abs(totalChildAmount - (r.grossSubmittedAmount || r.amount)) <= MONEY_TOLERANCE,
    };
  });

  for (const p of drawPackets) {
    if (!p.derekThreadId || !p.derekMessageId || !p.sentDate) {
      exceptions.push({
        code: 'submitted_missing_derek_source',
        severity: 'error',
        ledgerId: p.drawPacketId,
        message: `Draw #${p.drawNumber} packet is missing Derek Gmail thread/message/date evidence.`,
      });
    }
    if (p.childItemIds.length > 0 && !p.totalMatchesGross) {
      exceptions.push({
        code: 'draw_packet_total_mismatch',
        severity: 'error',
        ledgerId: p.drawPacketId,
        message: `Draw #${p.drawNumber} child total $${p.totalChildAmount.toFixed(2)} does not match gross $${p.grossRequestedAmount.toFixed(2)}.`,
      });
    }
  }

  const membership = new Map<string, string[]>();
  for (const p of drawPackets) {
    for (const id of p.childItemIds) membership.set(id, [...(membership.get(id) ?? []), p.drawPacketId]);
  }
  for (const [id, packetIds] of membership) {
    if (packetIds.length > 1) {
      exceptions.push({
        code: 'duplicate_draw_membership',
        severity: 'error',
        ledgerId: id,
        message: `${id} is linked to multiple draw packets (${packetIds.join(', ')}) without an explicit correction/short-pay marker.`,
      });
    }
  }

  const fundingRecords: FundingRecord[] = rows
    .filter((r) => FUNDED_RE.test(rowHaystack(r)) && !SUPPORT_ONLY_FUNDING_RE.test(rowHaystack(r)) && (r.fundedAmount > 0 || /funding|draw funded/i.test(rowHaystack(r))))
    .map((r) => {
      const packet = findPacketForRow(r, drawPackets);
      const drawNumber = drawNumberFromText(rowHaystack(r));
      return {
        fundingId: r.ledgerId,
        drawPacketId: packet?.drawPacketId || (drawNumber ? `draw-${drawNumber}` : ''),
        fundedAmount: r.fundedAmount || r.expectedFundedAmount || r.amount,
        fundedDate: r.fundedDate || r.docDate,
        sourceEvidence: r.sourceLink || r.sourceEvidence || r.notes,
      };
    });

  const invoiceReceiptLedger = rows.map((r) => {
    const packet = findPacketForRow(r, drawPackets);
    const status = normalizeInvoiceStatus(r, packet);
    return {
      ledgerId: r.ledgerId,
      vendorPayee: r.vendorPayee,
      amount: r.amount,
      status,
      drawPacketId: packet?.drawPacketId || '',
      statusEvidence: sourceEvidenceSentence(r, packet),
    };
  });

  for (const r of rows) {
    const packet = findPacketForRow(r, drawPackets);
    const hay = rowHaystack(r);
    const isPacket = drawPackets.some((p) => p.drawPacketId === `draw-${drawNumberFromText(hay)}` && /packet:gross|draw(?:\s+request)?\s+packet|cover email/i.test(hay));
    const claimsSubmitted = !KNOWN_NOT_SUBMITTED_RE.test(hay) && (r.submittedToDerek || SUBMITTED_RE.test(hay));
    const claimsFunded = !SUPPORT_ONLY_FUNDING_RE.test(hay) && (r.fundedAmount > 0 || FUNDED_RE.test(hay));
    const status = normalizeInvoiceStatus(r, packet);

    if (KNOWN_NOT_SUBMITTED_RE.test(hay)) {
      exceptions.push({
        code: status === 'next_draw_draft' ? 'next_draw_draft_not_submitted' : 'known_not_submitted_item',
        severity: 'info',
        ledgerId: r.ledgerId,
        message: `${r.vendorPayee || r.ledgerId}: ${sourceEvidenceSentence(r, packet)}.`,
      });
    }

    if (claimsSubmitted && !isPacket && !hasDerekSubmissionSource(r, packet)) {
      exceptions.push({
        code: 'submitted_missing_derek_source',
        severity: 'error',
        ledgerId: r.ledgerId,
        message: `${r.vendorPayee || r.ledgerId} claims submitted but has no linked Derek Gmail message/thread source event.`,
      });
    }

    if (claimsFunded && !packet && !/funding|draw\d+:unit14:gross/i.test(hay)) {
      exceptions.push({
        code: 'funded_missing_submitted_draw',
        severity: 'error',
        ledgerId: r.ledgerId,
        message: `${r.vendorPayee || r.ledgerId} claims funded but is not linked to a submitted draw packet.`,
      });
    }

    if (claimsFunded && !r.fundedDate && !/verify/i.test(hay)) {
      exceptions.push({
        code: 'funded_missing_funding_evidence',
        severity: 'error',
        ledgerId: r.ledgerId,
        message: `${r.vendorPayee || r.ledgerId} claims funded but funded date/evidence is missing.`,
      });
    }

    if ((status === 'draw_ready' || claimsSubmitted) && OPEN_OR_QUOTE_RE.test(hay) && !PAYMENT_PROOF_RE.test(hay)) {
      exceptions.push({
        code: 'quote_or_open_without_payment_proof',
        severity: 'error',
        ledgerId: r.ledgerId,
        message: `${r.vendorPayee || r.ledgerId} is quote/open/support-only and cannot be draw-ready/submitted without payment proof.`,
      });
    }
  }

  return {
    invoiceReceiptLedger,
    drawPackets,
    fundingRecords,
    exceptions,
    warnings: exceptions.filter((e) => e.severity === 'error').map((e) => e.message),
  };
}

export function rowHasSourceBackedSubmittedStatus(r: DrawLedgerRow, rows: DrawLedgerRow[]): boolean {
  const ledger = buildSourceEventLedger(rows);
  const packet = findPacketForRow(r, ledger.drawPackets);
  return hasDerekSubmissionSource(r, packet);
}

export function sourceStatusLabel(status: SourceEventStatus): string {
  switch (status) {
    case 'submitted': return 'Submitted with source evidence';
    case 'funded': return 'Funded with source evidence';
    case 'draw_ready': return 'Draw-ready, not submitted';
    case 'next_draw_draft': return 'Next draw draft only';
    case 'not_submitted': return 'Not submitted';
    case 'needs_review': return 'Needs review';
    case 'open_committed': return 'Open committed';
    case 'paid_proof_found': return 'Paid/proof found';
    case 'quote_only': return 'Quote only';
    case 'excluded': return 'Excluded';
    case 'new': return 'New';
  }
}
