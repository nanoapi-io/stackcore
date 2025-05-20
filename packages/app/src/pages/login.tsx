import { useState } from "react";
import { Button } from "../components/shadcn/Button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/shadcn/Card.tsx";
import { Input } from "../components/shadcn/Input.tsx";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../components/shadcn/InputOTP.tsx";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { toast } from "../components/shadcn/hooks/use-toast.tsx";
import { ChevronLeft, Loader } from "lucide-react";
import LoggedOutLayout from "../layout/loggedOut.tsx";
import { useNavigate } from "react-router";
import { useCoreApi } from "../contexts/CoreApi.tsx";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/shadcn/Form.tsx";

export default function LoginPage() {
  const navigate = useNavigate();

  const coreApiContext = useCoreApi();

  const [isBusy, setIsBusy] = useState(false);

  const emailFormSchema = z.object({
    email: z.string().email(),
  });

  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: "",
    },
    disabled: isBusy,
  });

  const otpFormSchema = z.object({
    otp: z.string().min(6, { message: "One time password must be 6 digits" }),
  });

  const otpForm = useForm<z.infer<typeof otpFormSchema>>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
      otp: "",
    },
    disabled: isBusy,
  });

  const [step, setStep] = useState<"email" | "otp">("email");

  async function onEmailSubmit(values: z.infer<typeof emailFormSchema>) {
    setIsBusy(true);

    try {
      const response = await coreApiContext.handleRequest(
        "/auth/requestOtp",
        "POST",
        {
          email: values.email,
        },
      );

      if (!response.ok || response.status !== 200) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setStep("otp");
    } catch (error) {
      console.error(error);
      toast({
        title: "Unexpected error",
        description: "Failed to send one time password",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  }

  function handleOtpBack() {
    setStep("email");
  }

  async function handleOtpSubmit(values: z.infer<typeof otpFormSchema>) {
    setIsBusy(true);

    try {
      const response = await coreApiContext.handleRequest(
        "/auth/verifyOtp",
        "POST",
        {
          email: emailForm.getValues("email"),
          otp: values.otp,
        },
      );

      if (!response.ok && response.status === 400) {
        const { error } = await response.json() as { error: string };
        if (error === "invalid_otp") {
          toast({
            title: "Invalid one time password",
            description:
              "Please check your email for the correct one time password",
            variant: "destructive",
          });
          setIsBusy(false);
          return;
        }
        throw new Error(error);
      }

      if (!response.ok || response.status !== 200) {
        throw new Error("Failed to verify one time password");
      }

      const { token } = await response.json() as { token: string };

      coreApiContext.login(token);
      navigate("/");
    } catch (error) {
      toast({
        title: "Unexpected error",
        description: "Failed to verify one time password",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <LoggedOutLayout className="flex h-screen items-center justify-center">
      <Card className="w-full max-w-md m-5">
        <CardHeader>
          <CardTitle className="flex justify-center items-center gap-2">
            <img src="/logo.png" alt="Logo" width={32} height={32} />
            Sign in / up
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === "email"
            ? (
              <Form {...emailForm}>
                <form
                  onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                  className="flex flex-col items-center space-y-4"
                >
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={isBusy}
                    className="flex items-center space-x-2"
                  >
                    {isBusy && <Loader className="animate-spin" />}
                    Send one time password
                  </Button>
                </form>
              </Form>
            )
            : (
              <Form {...otpForm}>
                <form
                  onSubmit={otpForm.handleSubmit(handleOtpSubmit)}
                  className="flex flex-col items-center space-y-4"
                >
                  <FormDescription>
                    A one-time password was sent to
                    <br />
                    {emailForm.getValues("email")}.
                  </FormDescription>
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>One-Time Password</FormLabel>
                        <FormControl>
                          <InputOTP maxLength={6} {...field}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="secondary"
                      type="button"
                      disabled={isBusy}
                      onClick={handleOtpBack}
                    >
                      <ChevronLeft />
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isBusy}
                      className="w-full flex items-center space-x-2"
                    >
                      {isBusy && <Loader className="animate-spin" />}
                      Login
                    </Button>
                  </div>
                </form>
              </Form>
            )}
        </CardContent>
      </Card>
    </LoggedOutLayout>
  );
}
