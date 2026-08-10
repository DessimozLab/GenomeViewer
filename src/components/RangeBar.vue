<template>
  <div class="range-bar">

    <svg v-if="violinPath" class="range-bar-violin" :width="width" :height="violinHeight">
      <path :d="violinPath" fill="rgba(99, 99, 102, 0.35)"></path>
    </svg>

    <svg ref="track" class="range-bar-track" :width="width" :height="barHeight">
      <defs v-if="gradientStops">
        <linearGradient :id="gradientId" x1="0" x2="1" y1="0" y2="0">
          <stop
              v-for="(color, index) in gradientStops"
              :key="index"
              :offset="gradientStops.length > 1 ? index / (gradientStops.length - 1) : 0"
              :stop-color="color"
          />
        </linearGradient>
      </defs>

      <rect
          :width="width" :height="barHeight" rx="3"
          :fill="gradientStops ? `url(#${gradientId})` : '#8f8f8f'"
      />
    </svg>

    <div class="range-ticks" :style="{width: width + 'px'}">

      <span v-if="editing !== 'min'" class="tick tick-editable" @click="startEdit('min')">{{ format(min_base) }}</span>
      <input v-else ref="editInput" type="text" inputmode="decimal" class="tick-input" v-model.number="editValue"
             autocomplete="off" :name="minInputName" data-1p-ignore data-lpignore="true" data-bwignore
             @blur="commit('min')" @keyup.enter="commit('min')" @keyup.escape="cancelEdit">

      <span class="tick">{{ format(quarter1) }}</span>
      <span class="tick">{{ format(midpoint) }}</span>
      <span class="tick">{{ format(quarter3) }}</span>

      <span v-if="editing !== 'max'" class="tick tick-editable" @click="startEdit('max')">{{ format(max_base) }}</span>
      <input v-else ref="editInput" type="text" inputmode="decimal" class="tick-input" v-model.number="editValue"
             autocomplete="off" :name="maxInputName" data-1p-ignore data-lpignore="true" data-bwignore
             @blur="commit('max')" @keyup.enter="commit('max')" @keyup.escape="cancelEdit">

    </div>

  </div>
</template>

<script>

import * as d3 from 'd3';

export default {
  name: "RangeBar",
  props: {
    text: String,
    min_base: Number,
    max_base: Number,
    density: {
      // {points: [{value, density}, ...], domainMin, domainMax, maxDensity} - domain is the true,
      // untrimmed data extent, independent of min_base/max_base, see violinPath() below
      type: Object,
      default: null,
    },
    gradientStops: {
      type: Array,
      default: null,
    },
    width: {
      type: Number,
      default: 280,
    },
    barHeight: {
      type: Number,
      default: 16,
    },
    violinHeight: {
      type: Number,
      default: 30,
    },
  },
  emits: ['update-extent'],
  data() {
    return {
      editing: null, // null | 'min' | 'max'
      editValue: 0,
      gradientId: 'range-gradient-' + Math.random().toString(36).slice(2),
    };
  },
  computed: {
    minInputName() {
      return 'range-min-' + this.gradientId;
    },
    maxInputName() {
      return 'range-max-' + this.gradientId;
    },
    quarter1() {
      return this.min_base + 0.25 * (this.max_base - this.min_base);
    },
    midpoint() {
      return this.min_base + 0.5 * (this.max_base - this.min_base);
    },
    quarter3() {
      return this.min_base + 0.75 * (this.max_base - this.min_base);
    },
    violinPath() {
      if (!this.density || !this.density.points.length) {
        return '';
      }

      // x-scale is deliberately built from the LIVE min_base/max_base (not density.domainMin/Max):
      // the curve's sample points sit at their true, fixed values, so mapping them through whatever
      // range is currently active is what truncates the violin when the user narrows min/max - no
      // recomputation needed, points outside [min_base, max_base] just land outside the <svg> and
      // are clipped by its viewport.
      const xScale = d3.scaleLinear().domain([this.min_base, this.max_base]).range([0, this.width]);
      const yScale = d3.scaleLinear().domain([0, this.density.maxDensity || 1]).range([0, this.violinHeight / 2]);
      const center = this.violinHeight / 2;

      const top = this.density.points.map(p => `${xScale(p.value)},${center - yScale(p.density)}`);
      const bottom = this.density.points.slice().reverse().map(p => `${xScale(p.value)},${center + yScale(p.density)}`);

      return `M${top.join('L')}L${bottom.join('L')}Z`;
    },
  },
  methods: {
    format(value) {
      return value == null ? '' : d3.format(",.4~g")(value);
    },
    startEdit(side) {
      this.editing = side;
      this.editValue = side === 'min' ? this.min_base : this.max_base;
      this.$nextTick(() => this.$refs.editInput && this.$refs.editInput.focus());
    },
    cancelEdit() {
      this.editing = null;
    },
    commit(side) {
      if (this.editing !== side) {
        return;
      }
      this.editing = null;
      const min = side === 'min' ? this.editValue : this.min_base;
      const max = side === 'max' ? this.editValue : this.max_base;
      this.$emit('update-extent', {min, max, accessor: this.text});
    },
  },
};

</script>


<style scoped>
.range-bar {
  display: inline-block;
}

.range-bar-violin {
  display: block;
}

.range-ticks {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
  font-size: smaller;
  color: rgb(99, 99, 102);
}

.tick-editable {
  cursor: pointer;
  border-bottom: 1px dotted rgb(150, 150, 150);
}

.tick-editable:hover {
  color: black;
}

.tick-input {
  width: 58px;
  font-size: smaller;
}
</style>
