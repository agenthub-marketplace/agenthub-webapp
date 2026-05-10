import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PlaceholderPageProps = {
  title: string;
  eyebrow: string;
  description: string;
  notes: string[];
};

const navigation = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/creator", label: "Creator" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/admin", label: "Admin" },
];

export function PlaceholderPage({
  title,
  eyebrow,
  description,
  notes,
}: PlaceholderPageProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
        <nav className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-1 hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <section className="space-y-4">
          <Badge variant="secondary">{eyebrow}</Badge>
          <div className="space-y-3">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              {description}
            </p>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Planned foundation</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              {notes.map((note) => (
                <li key={note} className="rounded-md border bg-card p-3">
                  {note}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
