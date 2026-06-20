import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Mail, Sparkles } from "lucide-react";

const units = Array.from({ length: 15 }, (_, i) => `Unit ${i + 1}`);

const ExtendStay = () => {
  const [unit, setUnit] = useState("Unit 1");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [checkout, setCheckout] = useState("");
  const [nights, setNights] = useState("");
  const [notes, setNotes] = useState("");

  const subject = `Extend my stay request - ${unit}`;
  const body = useMemo(() => {
    return [
      `Unit: ${unit}`,
      `Guest name: ${name || ""}`,
      `Email: ${email || ""}`,
      `Phone: ${phone || ""}`,
      `Current checkout date: ${checkout || ""}`,
      `Requested extra nights: ${nights || ""}`,
      `Notes: ${notes || ""}`,
    ].join("\n");
  }, [unit, name, email, phone, checkout, nights, notes]);

  const mailto = `mailto:booking@homestead-hill.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="min-h-screen pattern-bg px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center space-y-3">
          <Badge className="bg-secondary text-secondary-foreground px-4 py-1">Homestead Hill</Badge>
          <h1 className="font-heading text-4xl md:text-5xl font-semibold text-foreground">Extend Your Stay</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Need a few more nights? Send us a quick request and we’ll review availability and pricing for your unit.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
          <Card className="glass-card border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-secondary" /> Request details</CardTitle>
              <CardDescription>Choose your unit and tell us what dates you need.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue placeholder="Select a unit" /></SelectTrigger>
                  <SelectContent>{units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><label className="text-sm font-medium">Guest name</label><Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your full name" /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Phone</label><Input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="(555) 555-5555" /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><label className="text-sm font-medium">Email</label><Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Current checkout date</label><Input value={checkout} onChange={(e)=>setCheckout(e.target.value)} placeholder="MM/DD/YYYY" /></div>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">How long would you like to stay?</label><Input value={nights} onChange={(e)=>setNights(e.target.value)} placeholder="Example: 3 more nights / through Friday" /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Anything else we should know?</label><Textarea value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Optional note" rows={4} /></div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90"><a href={mailto}><Mail className="h-4 w-4 mr-2" /> Send request</a></Button>
                <Button variant="outline" asChild><a href={`/?unit=${encodeURIComponent(unit)}`}>Back to website</a></Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-secondary" /> How it works</CardTitle>
              <CardDescription>Fast, simple, and tied to your unit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <ol className="space-y-3 list-decimal list-inside">
                <li>Open the QR code for your unit.</li>
                <li>Choose your unit and send a request.</li>
                <li>Dalton and Hannah review availability and pricing.</li>
                <li>We confirm your extension and next steps by email.</li>
              </ol>
              <div className="rounded-lg border border-border/60 bg-background/60 p-4">
                <div className="font-medium text-foreground mb-2">Suggested QR URL pattern</div>
                <code className="text-xs break-all">https://homestead-hill.com/extend-stay?unit=Unit+1</code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExtendStay;