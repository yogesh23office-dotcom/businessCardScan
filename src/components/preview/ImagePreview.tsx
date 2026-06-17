import { Button } from "@/components/common/Button";

export const ImagePreview = ({
  src,
  onClear,
}: {
  src: string;
  fileName?: string;
  onClear: () => void;
}) => (
  <div className="space-y-3">
    <div className="overflow-hidden rounded-sm border border-border/50 bg-muted/10">
      <img src={src} alt="Business card preview" className="h-auto max-h-64 w-full object-contain" />
    </div>
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">Scanned card</p>
      <Button variantType="danger" className="h-8 rounded-sm px-3 text-xs" onClick={onClear}>
        Remove
      </Button>
    </div>
  </div>
);
