<template>
  <div class="legend-row">

    <span class="legend-row-label">{{ label }}</span>

    <div class="legend-row-body">

      <DropdownButton
          :id="id"
          v-model="localAccessor"
          :options="options"
          :for_edge="forEdge"
          variant="text"
          :no_indicator="true"
          :text="localAccessor || 'Select metric'"
          spanStyle="font-size: 13px; font-weight: 600;"
      />

      <RangeBar
          v-if="localAccessor && extent"
          ref="rangeBar"
          :text="localAccessor"
          :min_base="extent.min"
          :max_base="extent.max"
          :density="extent.density"
          :gradientStops="gradientStops"
          @update-extent="$emit('update-extent', $event)"
      />

      <span v-else class="legend-row-empty">No metric selected</span>

    </div>

  </div>
</template>

<script>

import * as d3 from 'd3';
import DropdownButton from './DropdownButton.vue';
import RangeBar from './RangeBar.vue';

export default {
  name: "LegendColorRow",
  components: {
    DropdownButton,
    RangeBar,
  },
  props: {
    id: String,
    label: String,
    options: Array,
    forEdge: {
      type: Boolean,
      default: false,
    },
    accessor: [String, null],
    settings: Object,
  },
  emits: ['update:accessor', 'update-extent'],
  data() {
    return {
      localAccessor: this.accessor,
    };
  },
  computed: {
    extent() {
      return this.settings.data_metrics.numerical[this.localAccessor];
    },
    colorInterpolator() {
      return this.settings.color_scheme_list[this.settings.color_scheme];
    },
    gradientStops() {
      const steps = 10;
      return Array.from({length: steps}, (_, i) => d3.color(this.colorInterpolator(i / (steps - 1))).formatHex());
    },
  },
  watch: {
    accessor(newVal) {
      this.localAccessor = newVal;
    },
    localAccessor(newVal) {
      this.$emit('update:accessor', newVal);
    },
  },
  methods: {
    trackEl() {
      return this.$refs.rangeBar ? this.$refs.rangeBar.$refs.track : null;
    },
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
