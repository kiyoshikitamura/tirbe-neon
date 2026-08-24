import { notFound } from "next/navigation";
import { AudioProvider } from "@/audio/AudioProvider";
import { isQaHarnessAvailable } from "@/domain/presentation/qaHarness";
import QaPresentationHarness from "./QaPresentationHarness";

export const dynamic = "force-dynamic";

export default function QaPresentationPage() {
  if (!isQaHarnessAvailable(process.env.NEXT_PUBLIC_APP_ENV, process.env.NODE_ENV)) notFound();
  return <AudioProvider><QaPresentationHarness /></AudioProvider>;
}
