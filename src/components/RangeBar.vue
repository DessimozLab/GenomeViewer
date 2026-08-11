<template>
  <div class="range-bar">

    <div class="range-bar-track-wrap dropdown" v-if="hasSchemeDropdown">
      <div class="range-bar-toggle" role="button" data-bs-toggle="dropdown" aria-expanded="false" title="Change color scheme">
        <svg ref="track" class="range-bar-track" :width="width" :height="barHeight">
          <defs>
            <linearGradient :id="gradientId" x1="0" x2="1" y1="0" y2="0">
              <stop
                  v-for="(color, index) in gradientStops"
                  :key="index"
                  :offset="gradientStops.length > 1 ? index / (gradientStops.length - 1) : 0"
                  :stop-color="color"
              />
            </linearGradient>
          </defs>
          <rect :width="width" :height="barHeight" rx="3" :fill="`url(#${gradientId})`"></rect>
        </svg>
        <i class="bi bi-caret-down-fill range-bar-caret"></i>
      </div>

      <ul class="dropdown-menu scheme-menu">
        <li v-for="option in colorSchemeOptions" :key="option.name">
          <button type="button" class="dropdown-item scheme-option" @click="$emit('update:colorScheme', option.name)">
            <i class="bi bi-check2" :style="{visibility: option.name === colorScheme ? 'visible' : 'hidden'}"></i>
            <span class="scheme-swatch" :style="{background: previewGradient(option.stops)}"></span>
            {{ option.name }}
          </button>
        </li>
      </ul>
    </div>

    <svg v-else ref="track" class="range-bar-track" :width="width" :height="barHeight">
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
      <rect :width="width" :height="barHeight" rx="3" :fill="gradientStops ? `url(#${gradientId})` : '#8f8f8f'"></rect>
    </svg>

    <svg class="range-tick-marks" :width="width" height="5">
      <line v-for="(x, index) in tickX" :key="index" :x1="x" :x2="x" y1="0" y2="5" stroke="rgb(150, 150, 150)" stroke-width="1"></line>
    </svg>

    <div class="range-ticks" :style="{width: width + 'px'}">

      <span v-if="editing !== 'min'" class="tick tick-editable" :style="tickStyle(0)" @click="startEdit('min')">{{ format(min_base) }}</span>
      <input v-else ref="editInput" type="text" inputmode="decimal" class="tick-input" :style="tickStyle(0)" v-model.number="editValue"
             autocomplete="off" :name="minInputName" data-1p-ignore data-lpignore="true" data-bwignore
             @blur="commit('min')" @keyup.enter="commit('min')" @keyup.escape="cancelEdit">

      <span class="tick" :style="tickStyle(1)">{{ format(quarter1) }}</span>
      <span class="tick" :style="tickStyle(2)">{{ format(midpoint) }}</span>
      <span class="tick" :style="tickStyle(3)">{{ format(quarter3) }}</span>

      <span v-if="editing !== 'max'" class="tick tick-editable" :style="tickStyle(4)" @click="startEdit('max')">{{ format(max_base) }}</span>
      <input v-else ref="editInput" type="text" inputmode="decimal" class="tick-input" :style="tickStyle(4)" v-model.number="editValue"
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
    gradientStops: {
      type: Array,
      default: null,
    },
    colorSchemeOptions: {
      // {name, stops}[] - stops is a small array of hex colors sampled across the scheme, used to
      // render a preview swatch per option so you don't have to guess a scheme from its name alone
      type: Array,
      default: null,
    },
    colorScheme: {
      type: String,
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
  },
  emits: ['update-extent', 'update:colorScheme'],
  data() {
    return {
      editing: null, // null | 'min' | 'max'
      editValue: 0,
      gradientId: 'range-gradient-' + Math.random().toString(36).slice(2),
    };
  },
  computed: {
    hasSchemeDropdown() {
      return !!(this.gradientStops && this.colorSchemeOptions && this.colorSchemeOptions.length);
    },
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
    // 5 evenly-spaced x-positions along the bar's width - min/25%/50%/75%/max are a linear split
    // of [min_base, max_base] by construction, so these fractions of width are exactly where each
    // tick and its label belong (no separate scale needed).
    tickX() {
      return [0, 0.25, 0.5, 0.75, 1].map(f => f * this.width);
    },
  },
  methods: {
    format(value) {
      return value == null ? '' : d3.format(",.4~g")(value);
    },
    previewGradient(stops) {
      return `linear-gradient(to right, ${stops.join(', ')})`;
    },
    // Position each label at its tick's x, anchoring the text so it stays within the bar's width
    // instead of centering it off the edge: start-aligned at the first tick, end-aligned at the
    // last, centered in between.
    tickStyle(index) {
      const x = this.tickX[index];
      const anchor = index === 0 ? '0%' : index === this.tickX.length - 1 ? '-100%' : '-50%';
      return {left: `${x}px`, transform: `translateX(${anchor})`};
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

.range-bar-track-wrap {
  position: relative;
  display: inline-block;
}

.range-bar-toggle {
  cursor: pointer;
}

.range-bar-caret {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 8px;
  color: white;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.75), 0 0 1px rgba(0, 0, 0, 0.75);
  pointer-events: none;
}

.range-tick-marks {
  display: block;
}

.range-ticks {
  position: relative;
  height: 16px;
  margin-top: 2px;
  font-size: smaller;
  color: rgb(99, 99, 102);
}

.tick {
  position: absolute;
  white-space: nowrap;
}

.tick-editable {
  cursor: pointer;
  border-bottom: 1px dotted rgb(150, 150, 150);
}

.tick-editable:hover {
  color: black;
}

.tick-input {
  position: absolute;
  width: 58px;
  font-size: smaller;
}

.scheme-menu {
  max-height: 340px;
  overflow-y: auto;
}

.scheme-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scheme-swatch {
  display: inline-block;
  width: 44px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}
</style>
