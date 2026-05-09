<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import DatePicker from '../shared/DatePicker.svelte';
  import { Input } from '$lib/components/ui/input/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import type { CardFilters, CardPriority, Column } from '../../types';

  type Props = {
    filters: CardFilters;
    columns: Column[];
    availableTags: string[];
    onFiltersChange: (next: Partial<CardFilters>) => void;
    onReset: () => void;
  };

  const priorities: CardPriority[] = ['low', 'medium', 'high', 'urgent'];

  let { filters, columns, availableTags, onFiltersChange, onReset }: Props = $props();

  let tagInput = $state('');
  const dueDateModeLabel = $derived.by(() => {
    if (filters.dueDateMode === 'with') {
      return 'Has Due Date';
    }
    if (filters.dueDateMode === 'without') {
      return 'No Due Date';
    }
    if (filters.dueDateMode === 'overdue') {
      return 'Overdue';
    }
    return 'All Due Date';
  });
  const filterColumnLabel = $derived.by(() => {
    const selectedId = filters.columnIds[0];
    if (!selectedId) {
      return 'All Status';
    }

    return columns.find((column) => column.id === selectedId)?.title ?? 'All Status';
  });

  function togglePriority(priority: CardPriority): void {
    const exists = filters.priorities.includes(priority);
    onFiltersChange({
      priorities: exists
        ? filters.priorities.filter((item) => item !== priority)
        : [...filters.priorities, priority],
    });
  }

  function applyTagInput(): void {
    const tags = tagInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    onFiltersChange({ tags });
  }
</script>

<div class="toolbar">
  <div class="inline-group">
    <Select.Root
      type="single"
      value={filters.columnIds[0] ?? '__all__'}
      onValueChange={(value) =>
        onFiltersChange({
          columnIds: value === '__all__' ? [] : [value],
        })}
    >
      <Select.Trigger class="w-[170px]">{filterColumnLabel}</Select.Trigger>
      <Select.Content>
        <Select.Item value="__all__">All Status</Select.Item>
        {#each columns as column (column.id)}
          <Select.Item value={column.id}>{column.title}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
    <Button type="button" variant="outline" onclick={onReset}>Reset</Button>
  </div>

  <Input
    type="search"
    value={filters.searchText}
    oninput={(event) => onFiltersChange({ searchText: event.currentTarget.value })}
    placeholder="Search title, description, tags"
  />

  <div class="inline-group">
    {#each priorities as priority (priority)}
      <Button
        type="button"
        size="xs"
        variant={filters.priorities.includes(priority) ? 'default' : 'outline'}
        onclick={() => togglePriority(priority)}
      >
        {priority}
      </Button>
    {/each}
  </div>

  <div class="inline-group grow">
    <Select.Root
      type="single"
      value={filters.dueDateMode}
      onValueChange={(value) => onFiltersChange({ dueDateMode: value as CardFilters['dueDateMode'] })}
    >
      <Select.Trigger class="w-[180px]">{dueDateModeLabel}</Select.Trigger>
      <Select.Content>
        <Select.Item value="all">All Due Date</Select.Item>
        <Select.Item value="with">Has Due Date</Select.Item>
        <Select.Item value="without">No Due Date</Select.Item>
        <Select.Item value="overdue">Overdue</Select.Item>
      </Select.Content>
    </Select.Root>
    <DatePicker
      value={filters.dueDateFrom}
      placeholder="Due from"
      title="Due date from"
      onValueChange={(value) => onFiltersChange({ dueDateFrom: value })}
    />
    <DatePicker
      value={filters.dueDateTo}
      placeholder="Due to"
      title="Due date to"
      onValueChange={(value) => onFiltersChange({ dueDateTo: value })}
    />
  </div>

  <div class="inline-group grow">
    <Input
      type="text"
      bind:value={tagInput}
      list="tag-list"
      placeholder="Filter tags: a,b,c"
      onblur={applyTagInput}
    />
    <datalist id="tag-list">
      {#each availableTags as tag (tag)}
        <option value={tag}></option>
      {/each}
    </datalist>
    <Button type="button" variant="outline" onclick={applyTagInput}>Apply Tags</Button>
  </div>
</div>

<style>
  .toolbar {
    display: grid;
    gap: 0.7rem;
    grid-template-columns: 1.2fr;
  }

  .inline-group {
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .grow {
    width: 100%;
  }

  @media (min-width: 900px) {
    .toolbar {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
