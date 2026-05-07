<script lang="ts">
  import { parseDate, type DateValue } from '@internationalized/date';
  import { Calendar as CalendarIcon, X } from '@lucide/svelte';
  import * as Calendar from '$lib/components/ui/calendar/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Popover from '$lib/components/ui/popover/index.js';

  type Props = {
    value?: string | null;
    placeholder?: string;
    title?: string;
    onValueChange?: (value: string | null) => void;
  };

  let {
    value = null,
    placeholder = 'Select date',
    title,
    onValueChange,
  }: Props = $props();

  let open = $state(false);
  let lastSyncedValue: string | null = null;
  let calendarValue = $state<DateValue | undefined>(undefined);

  function toDateValue(input: string | null | undefined): DateValue | undefined {
    if (!input) {
      return undefined;
    }

    try {
      return parseDate(input);
    } catch {
      return undefined;
    }
  }

  $effect(() => {
    const nextValue = value ?? null;
    if (nextValue !== lastSyncedValue) {
      lastSyncedValue = nextValue;
      calendarValue = toDateValue(nextValue);
    }
  });

  function handleCalendarChange(nextDate: DateValue | undefined): void {
    calendarValue = nextDate;
    const nextValue = nextDate?.toString() ?? null;
    lastSyncedValue = nextValue;
    onValueChange?.(nextValue);
    if (nextDate) {
      open = false;
    }
  }

  function clearDate(): void {
    calendarValue = undefined;
    lastSyncedValue = null;
    onValueChange?.(null);
    open = false;
  }
</script>

<div class="date-picker">
  <Popover.Root bind:open>
    <Popover.Trigger
      type="button"
      class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring inline-flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      {title}
    >
      <span class={calendarValue ? 'text-foreground' : 'text-muted-foreground'}>
        {calendarValue ? calendarValue.toString() : placeholder}
      </span>
      <CalendarIcon class="size-4 text-muted-foreground" />
    </Popover.Trigger>
    <Popover.Content class="w-auto p-0" align="start">
      <Calendar.Calendar type="single" value={calendarValue} onValueChange={handleCalendarChange} />
    </Popover.Content>
  </Popover.Root>

  {#if calendarValue}
    <Button type="button" size="icon-xs" variant="ghost" onclick={clearDate} title="Clear date">
      <X class="size-3.5" />
      <span class="sr-only">Clear date</span>
    </Button>
  {/if}
</div>

<style>
  .date-picker {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
</style>
