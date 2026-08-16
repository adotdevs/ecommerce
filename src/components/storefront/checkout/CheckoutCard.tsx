"use client";

import { Card } from "@heroui/react";
import { cn } from "@/components/ds/utils";

interface CheckoutCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function CheckoutCard({
  title,
  subtitle,
  children,
  className,
}: CheckoutCardProps) {
  return (
    <Card className={cn("gap-4 p-5 md:p-6", className)}>
      <Card.Header className="mb-0 gap-1.5 p-0">
        <Card.Title className="text-lg font-bold tracking-tight text-foreground md:text-xl">
          {title}
        </Card.Title>
        {subtitle ? (
          <Card.Description className="text-sm leading-5 !text-muted-foreground">
            {subtitle}
          </Card.Description>
        ) : null}
      </Card.Header>
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  );
}
