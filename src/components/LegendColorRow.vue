<template>
  <div class="legend-row">

    <span class="legend-row-label">{{ label }}</span>

    <div class="legend-row-body">

      <DropdownButton
          :id="id"
          v-model="localAccessor"
          :options="options"
          :metric_meta="settings.metric_meta"
          :for_edge="forEdge"
          variant="text"
          :no_indicator="true"
          :text="buttonText"
          spanStyle="font-size: 13px; font-weight: 600;"
      />

      <template v-if="localAccessor && extent">

        <ViolinRange
            v-if="showViolin"
            :text="localAccessor"
            :min_base="extent.min"
            :max_base="extent.max"
            :density="extent.density"
            @update-extent="$emit('update-extent', $event)"
        />

        <RangeBar
            ref="rangeBar"
            :text="localAccessor"
            :min_base="extent.min"
            :max_base="extent.max"
            :gradientStops="gradientStops"
            :colorSchemeOptions="colorSchemeOptions"
            :colorScheme="colorScheme"
            @update-extent="$emit('update-extent', $event)"
            @update:colorScheme="onSchemeChange"
        />

      </template>

      <span v-else class="legend-row-empty">No metric selected</span>

    </div>

  </div>
</template>

<script>

import * as d3 from 'd3';
import DropdownButton from './DropdownButton.vue';
import RangeBar from './RangeBar.vue';
import ViolinRange from './ViolinRange.vue';

export default {
  name: "LegendColorRow",
  components: {
    DropdownButton,
    RangeBar,
    ViolinRange,
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
    showViolin: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:accessor', 'update-extent', 'update-color-scheme'],
  data() {
    return {
      localAccessor: this.accessor,
    };
  },
  computed: {
    extent() {
      return this.settings.data_metrics.numerical[this.localAccessor];
    },
    // label/unit are configured externally per metric (settings.metric_meta), keyed by the exact
    // field name - so 'age_edge' can carry its own label/unit independent of any gene-level 'age'
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
    // color scheme is per-channel: Gene color and Edge color each keep their own, independent
    // of which metric currently occupies that channel
    schemeKey() {
      return this.forEdge ? 'color_scheme_edge' : 'color_scheme';
    },
    colorScheme() {
      return this.settings[this.schemeKey];
    },
    colorInterpolator() {
      return this.settings.color_scheme_list[this.colorScheme];
    },
    gradientStops() {
      return this.sampleGradient(this.colorInterpolator);
    },
    // {name, stops}[] so the scheme dropdown can render a preview swatch per option, not just its name
    colorSchemeOptions() {
      return Object.keys(this.settings.color_scheme_list).map(name => ({
        name,
        stops: this.sampleGradient(this.settings.color_scheme_list[name]),
      }));
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
    sampleGradient(interpolator, steps = 10) {
      return Array.from({length: steps}, (_, i) => d3.color(interpolator(i / (steps - 1))).formatHex());
    },
    onSchemeChange(scheme) {
      this.$emit('update-color-scheme', {key: this.schemeKey, value: scheme});
    },
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
