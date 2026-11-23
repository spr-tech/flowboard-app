import { socialCardAlt, socialCardImage } from "@/components/content/og/socialCardImage";

export const alt = socialCardAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return socialCardImage();
}
