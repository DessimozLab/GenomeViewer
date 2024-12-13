<template>
  <div class="color-legend">

    <div>
      <input type="number" id="min" v-model.number="min" @change="updateExtent">
    </div>


    <svg ref="legend" class="color-scale" :width="steps * 4 + 10" height="60">

      <text :x="0" y="10" font-size="smaller">{{ text }}</text>

      <rect  width="5" height="40" y="20" fill="gray"></rect>

      <text :x="10" y="30" font-size="smaller">{{ max }}</text>

      <text :x="10" y="58" font-size="smaller">{{ min }}</text>


    </svg>

    <div>
      <input type="number" id="max" v-model.number="max" @change="updateExtent">
    </div>

  </div>
</template>

<script>

export default {
  name: "ColorLegendVertical",
  props: {
    id:  String,
    min_base: Number,
    max_base: Number,
    text: String,
  },
  data() {

    return {
      min: this.min_base,
      max: this.max_base,
      steps: 100
    };
  },
  methods: {
    updateExtent() {
      this.$emit('update-extent', { min: this.min, max: this.max, steps: this.steps,accessor:this.text });
    }
  },
  watch: {
    min_base(newVal) {
      this.min = newVal;
    },
    max_base(newVal) {
      this.max = newVal;
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
