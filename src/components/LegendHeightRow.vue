<template>
  <div class="legend-row">

    <span class="legend-row-label">Gene height</span>

    <div class="legend-row-body">

      <DropdownButton
          :id="id"
          v-model="localAccessor"
          :options="options"
          :metric_meta="settings.metric_meta"
          variant="text"
          :no_indicator="true"
          :text="buttonText"
          spanStyle="font-size: 13px; font-weight: 600;"
      />

      <template v-if="localAccessor && extent">

        <ViolinRange
            :text="localAccessor"
            :min_base="extent.min"
            :max_base="extent.max"
            :density="extent.density"
            :width="width"
            @update-extent="onUpdateExtent"
        />

        <svg ref="heightBars" class="height-bars" :width="width" :height="rampHeight">
          <g v-for="(sample, index) in samples" :key="index" :transform="`translate(${(index + 0.5) * barSpacing - barWidth / 2}, 0)`">
            <rect
                :x="0" :y="rampHeight - sample.px - baseline"
                :width="barWidth" :height="sample.px" rx="2"
                fill="#8f8f8f"
            />
            <text :x="barWidth / 2" :y="rampHeight - sample.px - baseline - 4" text-anchor="middle" font-size="10">
              {{ formatValue(sample.value) }}
            </text>
          </g>
        </svg>

      </template>

      <span v-else class="legend-row-empty">No metric selected</span>

    </div>

  </div>
</template>

<script>

import * as d3 from 'd3';
import DropdownButton from './DropdownButton.vue';
import ViolinRange from './ViolinRange.vue';

export default {
  name: "LegendHeightRow",
  components: {
    DropdownButton,
    ViolinRange,
  },
  props: {
    id: String,
    options: Array,
    accessor: [String, null],
    settings: Object,
  },
  emits: ['update:accessor', 'update-extent'],
  data() {
    return {
      localAccessor: this.accessor,
      currentMin: null,
      currentMax: null,
      width: 280,
      baseline: 2,
    };
  },
  computed: {
    extent() {
      return this.settings.data_metrics.numerical[this.localAccessor];
    },
    // label/unit are configured externally per metric (settings.metric_meta), keyed by the exact
    // field name; height metrics are always gene-level (never '_edge')
    meta() {
      return (this.localAccessor && this.settings.metric_meta && this.settings.metric_meta[this.localAccessor]) || null;
    },
    buttonText() {
      if (!this.localAccessor) {
        return 'Select metric';
      }
      const label = (this.meta && this.meta.label) || this.localAccessor;
      return (this.meta && this.meta.unit) ? `${label} [${this.meta.unit}]` : label;
    },
    maxBarPx() {
      return this.settings.svgHeight;
    },
    // "nicely rounded" tick values (d3's standard axis-tick algorithm) within the current
    // min/max, rather than the raw min/mid/max - matches how a chart axis would label this range
    niceValues() {
      if (this.currentMin == null || this.currentMax == null || this.currentMin === this.currentMax) {
        return this.currentMin == null ? [] : [this.currentMin];
      }
      return d3.scaleLinear().domain([this.currentMin, this.currentMax]).ticks(6);
    },
    samples() {
      if (!this.niceValues.length) {
        return [];
      }
      const span = this.currentMax - this.currentMin;
      const px = (value) => span === 0 ? this.maxBarPx : Math.max(2, ((value - this.currentMin) / span) * this.maxBarPx);
      return this.niceValues.map((value) => ({value, px: px(value)}));
    },
    barSpacing() {
      return this.samples.length ? this.width / this.samples.length : this.width;
    },
    barWidth() {
      return Math.min(30, this.barSpacing * 0.6);
    },
    rampHeight() {
      return this.maxBarPx + this.baseline + 14;
    },
  },
  watch: {
    accessor(newVal) {
      this.localAccessor = newVal;
    },
    localAccessor(newVal) {
      this.$emit('update:accessor', newVal);
      this.resetExtentFromData(newVal);
    },
  },
  methods: {
    resetExtentFromData(accessorKey) {
      const extent = accessorKey && this.settings.data_metrics.numerical[accessorKey];
      this.currentMin = extent ? extent.min : null;
      this.currentMax = extent ? extent.max : null;
    },
    onUpdateExtent(payload) {
      this.currentMin = payload.min;
      this.currentMax = payload.max;
      this.$emit('update-extent', payload);
    },
    formatValue(value) {
      return d3.format(",.4~g")(value);
    },
    trackEl() {
      return this.$refs.heightBars || null;
    },
  },
  created() {
    this.resetExtentFromData(this.localAccessor);
  },
};

</script>


<style scoped>
.legend-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}

.legend-row-label {
  min-width: 90px;
  text-align: right;
  padding-top: 2px;
  color: rgb(99, 99, 102);
}

.legend-row-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.legend-row-empty {
  color: rgb(150, 150, 150);
  font-size: smaller;
}
</style>
