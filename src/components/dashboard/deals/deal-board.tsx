"use client";

import { useRef, useState } from "react";

import type { Deal, DealStage } from "@/lib/crm/client";

import { dealStages } from "./deal-types";
import { DealBoardColumn } from "./deal-board-column";

type DealBoardProps = {
  dealsLoading: boolean;
  deals: Deal[];
  selectedDealId: string | null;
  customerLabelById: Map<string, string>;
  onSelectDeal: (dealId: string) => void;
};

export function DealBoard({
  dealsLoading,
  deals,
  selectedDealId,
  customerLabelById,
  onSelectDeal,
}: Readonly<DealBoardProps>) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dealsByStage = new Map<DealStage, Deal[]>(
    dealStages.map((stage) => [
      stage.value,
      deals.filter((deal) => deal.stage === stage.value),
    ]),
  );

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const target = event.target;
    if (
      target instanceof Element &&
      target.closest("button, a, input, select, textarea, [data-no-board-drag]")
    ) {
      return;
    }

    const canScrollHorizontally = container.scrollWidth > container.clientWidth;
    if (!canScrollHorizontally) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
    };
    setIsDragging(true);
    container.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const container = scrollContainerRef.current;
    const dragState = dragStateRef.current;
    if (!container || !dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - dragState.startX;
    container.scrollLeft = dragState.startScrollLeft - deltaX;
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const container = scrollContainerRef.current;
    const dragState = dragStateRef.current;
    if (!container || !dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
    setIsDragging(false);
  }

  function handlePointerLeave(event: React.PointerEvent<HTMLDivElement>) {
    if (isDragging) {
      handlePointerUp(event);
    }
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
            Kanban board
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {dealsLoading ? "Loading board..." : `${deals.length} deals in the pipeline`}
          </p>
        </div>
      </div>

      <div
        className={`mt-5 overflow-x-auto pb-3 select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={scrollContainerRef}
      >
        <div className="flex min-w-max items-start gap-5">
          {dealStages.map((stage) => (
            <DealBoardColumn
              customerLabelById={customerLabelById}
              deals={dealsByStage.get(stage.value) ?? []}
              key={stage.value}
              onSelectDeal={onSelectDeal}
              selectedDealId={selectedDealId}
              stage={stage.value}
              stageDescription={stage.description}
              stageLabel={stage.label}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
