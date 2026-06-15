import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, BarChart3, Building2, RefreshCw, Search } from "lucide-react";
import { homesteadHillPlSnapshot } from "@/data/homesteadHillPlSnapshot";
import { supabase } from "@/integrations/supabase/client";

const snapshotData = homesteadHillPlSnapshot;
type DashboardData = typeof homesteadHillPlSnapshot;
type Txn = (typeof snapshotData.transactions)[number];

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const amountClass = (value: number) => value >= 0 ? "text-emerald-600" : "text-rose-600";
const unitSort = (a: string, b: string) => {
  const na = Number(a.match(/Unit (\d+)/)?.[1] ?? 999);
  const nb = Number(b.match(/Unit (\d+)/)?.[1] ?? 999);
  return na - nb || a.localeCompare(b);
};

const TransactionCard = ({ txn }: { txn: Txn }) => (
  <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3 md:grid md:grid-cols-[110px_1fr_120px] md:gap-4 md:space-y-0">
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">Date</div>
      <div className="font-semibold">{txn.date}</div>
      <div className="text-xs text-muted-foreground">{txn.type}{txn.num ? ` #${txn.num}` : ""}</div>
    </div>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{txn.account}</Badge>
        <Badge variant="outline">{txn.unit}</Badge>
        {txn.flags.map((flag) => <Badge key={flag} className="bg-amber-100 text-amber-900 hover:bg-amber-100">{flag}</Badge>)}
      </div>
      <div className="mt-2 font-semibold break-words">{txn.name || "No name"}</div>
      <div className="text-sm text-muted-foreground break-words">{txn.memo || "No memo"}</div>
      <div className="text-xs text-muted-foreground break-words">Split: {txn.split || "—"}</div>
    </div>
    <div className={`text-xl font-bold md:text-right ${amountClass(txn.amount)}`}>{money(txn.amount)}</div>
  </div>
);

const HomesteadHillPLContent = () => {
  const [data, setData] = useState<DashboardData>(snapshotData);
  const [dataSource, setDataSource] = useState("Embedded QBO snapshot");
  const [month, setMonth] = useState(snapshotData.months[0]?.month ?? "ALL");
  const [account, setAccount] = useState("ALL");
  const [unit, setUnit] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.functions
      .invoke<DashboardData>("homestead-hill-pl", { method: "GET" })
      .then(({ data: freshData, error }) => {
        if (error || !freshData?.transactions?.length) return;
        setData(freshData);
        setDataSource("Live Supabase / QuickBooks feed");
        setMonth(freshData.months[0]?.month ?? "ALL");
      })
      .catch(() => {
        setDataSource("Embedded QBO snapshot");
      });
  }, []);

  const months = data.months.map((m) => m.month);
  const selectedMonthData = data.months.find((m) => m.month === month) ?? data.months[0];
  const accounts = useMemo(() => Array.from(new Set(data.transactions.map((t) => t.account))).sort(), [data]);
  const units = useMemo(() => Array.from(new Set(data.transactions.map((t) => t.unit))).sort(unitSort), [data]);

  const unitRows = useMemo(() => data.unitMonth
    .filter((row) => row.month === month || (month === "ALL" && row.month === "ALL"))
    .filter((row) => row.income || row.expenses || month === "ALL")
    .sort((a, b) => unitSort(a.unit, b.unit)), [data, month]);

  const txns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.transactions.filter((txn) => {
      const matchesMonth = month === "ALL" || txn.month === month;
      const matchesAccount = account === "ALL" || txn.account === account;
      const matchesUnit = unit === "ALL" || txn.unit === unit;
      const matchesSearch = !q || Object.values(txn).join(" ").toLowerCase().includes(q);
      return matchesMonth && matchesAccount && matchesUnit && matchesSearch;
    });
  }, [data, month, account, unit, search]);

  const txnTotal = txns.reduce((sum, txn) => sum + txn.amount, 0);
  const completedMonths = data.months.filter((m) => !m.month.startsWith("Jun"));
  const completedExpenseActual = completedMonths.reduce((sum, m) => sum + m.expenses, 0);
  const completedBaseline = completedMonths.length * data.baselineMonthlyExpenses;

  const selectQuick = (kind: string) => {
    setSearch("");
    if (kind === "repairs") { setMonth("ALL"); setAccount("Repairs & maintenance"); setUnit("ALL"); }
    if (kind === "unallocated") { setMonth("ALL"); setAccount("ALL"); setUnit("Parent / unallocated"); }
    if (kind === "large") { setMonth("ALL"); setAccount("ALL"); setUnit("ALL"); setSearch("Large expense"); }
    if (kind === "review") { setMonth("ALL"); setAccount("ALL"); setUnit("ALL"); setSearch("Large"); }
    if (kind === "reset") { setMonth(data.months[0]?.month ?? "ALL"); setAccount("ALL"); setUnit("ALL"); setSearch(""); }
  };

  return (
    <div className="space-y-6">
      <main className="space-y-6">
        <section className="rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 md:p-10 text-white shadow-xl">
          <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide text-blue-200">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Homestead Hill</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">2818 Washington Avenue</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">QBO snapshot</span>
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">Operator P&amp;L Dashboard</h1>
          <p className="mt-3 max-w-3xl text-blue-100">Month, account, unit, and transaction-level drilldown. Data source: {dataSource}. The page will automatically use the live Supabase/QuickBooks endpoint once it is deployed.</p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">YTD income</CardTitle></CardHeader><CardContent className="text-3xl font-black text-emerald-600">{money(data.summary.income)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">YTD expenses + COGS</CardTitle></CardHeader><CardContent className="text-3xl font-black text-rose-600">{money(data.summary.expenses)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">YTD net</CardTitle></CardHeader><CardContent className={`text-3xl font-black ${amountClass(data.summary.net)}`}>{money(data.summary.net)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Transactions</CardTitle></CardHeader><CardContent className="text-3xl font-black text-blue-600">{data.summary.transactionCount}</CardContent></Card>
        </section>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col gap-2 p-5 text-amber-900 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5" /><div><b>Budget check:</b> completed-month actual expenses are {money(completedExpenseActual)} vs corrected baseline {money(completedBaseline)} ({money(completedExpenseActual - completedBaseline)}).</div></div>
            <div className="text-sm">Mortgage baseline: {money(6086.07)} / month</div>
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Best month</CardTitle></CardHeader><CardContent className="text-2xl font-black text-emerald-600">{data.months.reduce((a, b) => a.net > b.net ? a : b).month}</CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Worst month</CardTitle></CardHeader><CardContent className="text-2xl font-black text-rose-600">{data.months.reduce((a, b) => a.net < b.net ? a : b).month}</CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Parent/no unit rows</CardTitle></CardHeader><CardContent className="text-2xl font-black">{data.transactions.filter((t) => t.unit === "Parent / unallocated").length}</CardContent></Card>
        </section>

        <Card>
          <CardHeader><CardTitle>Quick questions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => selectQuick("repairs")}>Repairs &amp; maintenance</Button>
            <Button variant="secondary" onClick={() => selectQuick("large")}>Largest expenses</Button>
            <Button variant="secondary" onClick={() => selectQuick("unallocated")}>Parent / no unit</Button>
            <Button variant="secondary" onClick={() => selectQuick("review")}>Needs review</Button>
            <Button variant="outline" onClick={() => selectQuick("reset")}><RefreshCw className="mr-2 h-4 w-4" /> Reset</Button>
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-3">
          {data.months.map((m) => (
            <button key={m.month} onClick={() => { setMonth(m.month); setAccount("ALL"); }} className={`rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:border-primary ${month === m.month ? "border-primary ring-2 ring-primary/20" : ""}`}>
              <div className="flex justify-between gap-3"><h3 className="text-xl font-black">{m.month}</h3><Badge variant={m.net >= 0 ? "secondary" : "destructive"}>{m.net >= 0 ? "Profit" : "Loss"}</Badge></div>
              <div className="mt-4 grid gap-2 text-sm">
                <div className="flex justify-between"><span>Income</span><b className="text-emerald-600">{money(m.income)}</b></div>
                <div className="flex justify-between"><span>Expenses</span><b className="text-rose-600">{money(m.expenses)}</b></div>
                <div className="flex justify-between"><span>Net</span><b className={amountClass(m.net)}>{money(m.net)}</b></div>
              </div>
            </button>
          ))}
        </section>

        {selectedMonthData && month !== "ALL" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><CardTitle>{month} income lines</CardTitle></CardHeader><CardContent className="space-y-2">{selectedMonthData.incomeLines.map((line) => <Button key={line.name} variant={account === line.name ? "default" : "outline"} className="h-auto w-full justify-between whitespace-normal" onClick={() => setAccount(line.name)}><span>{line.name}</span><b>{money(line.amount)}</b></Button>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>{month} expense lines</CardTitle></CardHeader><CardContent className="space-y-2">{selectedMonthData.expenseLines.map((line) => <Button key={line.name} variant={account === line.name ? "default" : "outline"} className="h-auto w-full justify-between whitespace-normal" onClick={() => setAccount(line.name)}><span>{line.name}</span><b>{money(line.amount)}</b></Button>)}</CardContent></Card>
          </section>
        )}

        <Card>
          <CardHeader><CardTitle>Unit income + expenses — {month === "ALL" ? "all months" : month}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {unitRows.map((row) => <div key={`${row.unit}-${row.month}`} className="rounded-xl border p-4 space-y-2"><div className="flex justify-between"><b>{row.unit}</b><span className="text-xs text-muted-foreground">{row.count} txns</span></div><div className="grid grid-cols-2 gap-2 text-sm"><span>Income</span><b className="text-right text-emerald-600">{money(row.income)}</b><span>Expenses</span><b className="text-right text-rose-600">{money(row.expenses)}</b><span>Repairs</span><b className="text-right text-rose-600">{money(row.repairs)}</b><span>Net</span><b className={`text-right ${amountClass(row.net)}`}>{money(row.net)}</b></div><Button size="sm" variant="outline" className="w-full" onClick={() => setUnit(row.unit)}>Filter to {row.unit}</Button></div>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Transactions — {month} / {account} / {unit} ({txns.length} rows, {money(txnTotal)})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div><Label>Month</Label><Select value={month} onValueChange={setMonth}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All months</SelectItem>{months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Account</Label><Select value={account} onValueChange={setAccount}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All accounts</SelectItem>{accounts.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Unit</Label><Select value={unit} onValueChange={setUnit}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All units</SelectItem>{units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Search</Label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="vendor, memo, flag..." /></div></div>
            </div>
            <div className="space-y-3">{txns.map((txn, index) => <TransactionCard key={`${txn.date}-${txn.account}-${txn.amount}-${index}`} txn={txn} />)}</div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default HomesteadHillPLContent;
