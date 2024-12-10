<template>
  <div class="color-legend">

    <span style="width:30%">{{ text }}</span>


    <svg ref="legend" class="color-scale" :width="200" height="60">

      <rect  width="5" height="40" y="10" fill="gray"></rect>
      <text x="10" y="20" font-size="smaller">{{ extent.max }}</text>
      <text x="10" y="50" font-size="smaller">{{ extent.min }}</text>


    </svg>
  </div>
</template>

<script>

export default {
  name: "ColorLegendVertical",
  props: {
    id:  String,
    extent: Object,
    text: String,
  },
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
