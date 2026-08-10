<template>
  <div class="legend-row">

    <span class="legend-row-label">Gene height</span>

    <div class="legend-row-body">

      <DropdownButton
          :id="id"
          v-model="localAccessor"
          :options="options"
          variant="text"
          :no_indicator="true"
          :text="localAccessor || 'Select metric'"
          spanStyle="font-size: 13px; font-weight: 600;"
      />

      <div v-if="localAccessor && extent" class="legend-height-body">

        <RangeBar
            ref="rangeBar"
            :text="localAccessor"
            :min_base="extent.min"
            :max_base="extent.max"
            :density="extent.density"
            @update-extent="onUpdateExtent"
        />

        <svg class="size-ramp" :width="rampWidth" :height="rampHeight">
          <g v-for="(sample, index) in samples" :key="index" :transform="`translate(${index * barSpacing}, 0)`">
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

      </div>

      <span v-else class="legend-row-empty">No metric selected</span>

    </div>

  </div>
</template>

<script>

import * as d3 from 'd3';
import DropdownButton from './DropdownButton.vue';
import RangeBar from './RangeBar.vue';

export default {
  name: "LegendHeightRow",
  components: {
    DropdownButton,
    RangeBar,
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
      barWidth: 16,
      barSpacing: 26,
      baseline: 2,
    };
  },
  computed: {
    // matches settings.svgHeight so a sample bar's pixel height is directly comparable to the
    // actual gene boxes it's illustrating in the excerpt view, not just proportionally equivalent
    maxBarPx() {
      return this.settings.svgHeight;
    },
    extent() {
      return this.settings.data_metrics.numerical[this.localAccessor];
    },
    samples() {
      if (this.currentMin == null || this.currentMax == null) {
        return [];
      }
      const span = this.currentMax - this.currentMin;
      const mid = (this.currentMin + this.currentMax) / 2;
      const px = (value) => span === 0 ? this.maxBarPx : Math.max(2, ((value - this.currentMin) / span) * this.maxBarPx);
      return [this.currentMin, mid, this.currentMax].map((value) => ({value, px: px(value)}));
    },
    rampWidth() {
      return this.samples.length * this.barSpacing;
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
      return this.$refs.rangeBar ? this.$refs.rangeBar.$refs.track : null;
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

.legend-height-body {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.legend-row-empty {
  color: rgb(150, 150, 150);
  font-size: smaller;
}
</style>
