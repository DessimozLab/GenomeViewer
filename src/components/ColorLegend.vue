<template>
  <div class="color-legend">
    <span style="width:30%">{{ text }}</span>



    <svg ref="legend" class="color-scale" :width="scale.length * 20 + 200" height="20">

      <text x="0" y="15" font-size="smaller">{{ extent.min }}</text>

      <rect v-for="(color, index) in scale" :key="index" :x="index * 20 + 100" width="20" height="20" :fill="color"></rect>

      <text font-size="smaller" :x="scale.length * 20 + 105" y="15">{{ extent.max }}</text>


    </svg>
  </div>
</template>

<script>

import * as d3 from 'd3';

export default {
  name: "ColorLegend",
  props: {
    id:  String,
    extent: Object,
    text: String,

  },
  computed: {
    scale() {

      const scale =  d3.scaleSequential(d3.interpolateViridis).domain([this.extent.min, this.extent.max])//.ticks(10);

      const values = [];
      const step = (this.extent.max - this.extent.min) / 19; // 19 steps to get 20 values

      for (let i = 0; i < 20; i++) {
        values.push(scale(this.extent.min + i * step));
      }

      return values;
    }
  }
}

</script>


<style scoped>
.color-legend {
  display: flex;
  align-items: center;
}

.color-scale {
  margin-left: 8px;
}
</style>
