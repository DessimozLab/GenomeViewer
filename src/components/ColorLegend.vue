<template>
  <div class="color-legend">

    <div>
      <input type="number" id="min" v-model.number="min" @change="updateExtent">
    </div>


    <svg ref="legend" class="color-scale" :width="scale.length * 4 + 10" height="40">

      <text :x="0" y="10" font-size="smaller">{{ text }}</text>

      <rect v-for="(color, index) in scale" :key="index" :x="index * 4" y="15" width="4" height="20" :fill="color"></rect>

    </svg>

    <div>
      <input type="number" id="max" v-model.number="max" @change="updateExtent">
    </div>
  </div>
</template>

<script>

import * as d3 from 'd3';

export default {
  name: "ColorLegend",
  props: {
    id:  String,
    text: String,
    min_base: Number,
    max_base: Number,
    settings: Object
  },
  data() {

    return {
      min: this.min_base,
      max: this.max_base,
      steps: 100
    };
  },
  computed: {
    scale() {
      const scale =  d3.scaleSequential(this.settings.color_scheme_list[this.settings.color_scheme]).domain([this.min_base, this.max_base])//.ticks(10);

      const values = [];
      const step = (this.max_base - this.min_base) / this.steps; // 19 steps to get 20 values

      for (let i = 0; i < this.steps; i++) {
        values.push(scale(this.min_base + i * step));
      }

      return values;
    }
  },
  methods: {
    updateExtent() {
      this.$emit('update-extent', { min: this.min, max: this.max, steps: this.steps });
    }
  }
}

</script>


<style scoped>
.color-legend {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.color-scale {
  margin-left: 8px;
}
</style>
