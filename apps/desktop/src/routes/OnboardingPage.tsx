import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FlaskConical, Sparkles } from "lucide-react";
import { createWorkspaceSchema, type CreateWorkspaceInput } from "@pi-os/domain";
import { useCreateWorkspace } from "@pi-os/repositories";
import { seedDemoWorkspace } from "@pi-os/repositories/demo";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pi-os/ui/components/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@pi-os/ui/components/form";
import { toast } from "@pi-os/ui/components/sonner";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createWorkspace = useCreateWorkspace();
  const [loadingDemo, setLoadingDemo] = useState(false);

  const form = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { workspaceName: "", piName: "", institution: "" },
  });

  async function onSubmit(values: CreateWorkspaceInput) {
    try {
      await createWorkspace.mutateAsync({
        name: values.workspaceName,
        pi_name: values.piName,
        institution: values.institution || null,
      });
      toast.success("Workspace created");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Couldn't create your workspace", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function onLoadDemo() {
    setLoadingDemo(true);
    try {
      await seedDemoWorkspace();
      await queryClient.invalidateQueries();
      toast.success("Demo workspace loaded");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Couldn't load demo data", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoadingDemo(false);
    }
  }

  return (
    <div className="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-foreground flex items-center justify-center gap-2">
          <FlaskConical className="h-5 w-5" />
          <span className="text-sm font-semibold tracking-tight">Welcome to Research OS</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Set up your workspace</CardTitle>
            <CardDescription>
              Everything is stored locally on this computer. No account, no email, no password, no
              internet connection required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="piName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your name</FormLabel>
                      <FormControl>
                        <Input placeholder="Dr. Sarah Chen" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="institution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institution</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="State University"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="workspaceName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lab / workspace name</FormLabel>
                      <FormControl>
                        <Input placeholder="SIM Lab" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createWorkspace.isPending || loadingDemo}
                >
                  {createWorkspace.isPending ? "Creating workspace…" : "Create Workspace"}
                </Button>
              </form>
            </Form>

            <div className="mt-4 flex items-center gap-3">
              <div className="bg-border h-px flex-1" />
              <span className="text-muted-foreground text-xs">or</span>
              <div className="bg-border h-px flex-1" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full"
              disabled={loadingDemo || createWorkspace.isPending}
              onClick={onLoadDemo}
            >
              <Sparkles className="h-4 w-4" />
              {loadingDemo ? "Loading demo workspace…" : "Load Demo Workspace"}
            </Button>
            <p className="text-muted-foreground mt-2 text-center text-xs">
              Explore a fully populated sample lab — projects, people, meetings, publications, and
              grants.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
