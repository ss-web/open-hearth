<script setup lang="ts">
defineProps<{
  caption?: string
  columns: { key: string; label: string; numeric?: boolean }[]
  rows: Record<string, string>[]
}>()
</script>

<template>
  <div class="table-wrap">
    <table class="table">
      <caption v-if="caption" class="table__caption">{{ caption }}</caption>
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key" :class="{ table__num: column.numeric }" scope="col">{{ column.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="index">
          <td v-for="column in columns" :key="column.key" :data-label="column.label" :class="{ table__num: column.numeric }">{{ row[column.key] }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
