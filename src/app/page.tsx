import { HomePage } from "@/components/home-page";
import { isFeedbackEnabled } from "@/lib/feedback/config";

export default function Home() {
  return <HomePage feedbackEnabled={isFeedbackEnabled()} />;
}
