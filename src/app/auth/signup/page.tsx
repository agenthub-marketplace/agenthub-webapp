import Link from "next/link";
import { UserPlus } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-xl">
        <PageHeader
          eyebrow="Signup"
          title="Create your AgentHub account."
          description="This is a static signup form. Role-aware onboarding and Supabase Auth will be wired later."
        />

        <Card className="rounded-lg bg-white">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-[#f2eee8] text-[#5f5a52]">
              <UserPlus className="size-5" aria-hidden="true" />
            </div>
            <CardTitle>Sign up</CardTitle>
            <form className="mt-4 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="name">
                  Name
                </label>
                <Input id="name" placeholder="Your name" type="text" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <Input id="email" placeholder="you@example.com" type="email" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="password">
                  Password
                </label>
                <Input id="password" placeholder="••••••••" type="password" />
              </div>
              <button
                type="button"
                className={cn(buttonVariants({ size: "lg" }), "h-11 bg-[#181716]")}
              >
                Create account
              </button>
            </form>
            <p className="pt-2 text-sm text-[#6f675d]">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-medium text-[#181716] underline">
                Login
              </Link>
            </p>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  );
}
