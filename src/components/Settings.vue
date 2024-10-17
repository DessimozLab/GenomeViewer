<template>
 <div class="d-flex justify-content-end">

   <button id='button_type'  @click="$emit('toggle-type')" style="padding: 6px" class="btn btn-outline-dark  me-2">

     <i class="bi bi-rulers"></i>
     <span class="small-text" style="display: block;">{{ type === 'loci' ? 'Locus' : 'Fixed'}}</span>

   </button>

   <button class="btn btn-outline-dark me-2" data-bs-toggle="collapse" data-bs-target="#toggleDiv">
    <i class="bi bi-funnel"></i>
     <span class="small-text" style="display: block;">Filter</span>
  </button>

   <button id='button_sorting'  @click="$emit('toggle-sorting')" style="padding: 6px" class="btn btn-outline-dark  me-2">

     <i :class="sorting === 'size' ? 'bi bi-sort-up' : sorting === 'number_genes' ? 'bi bi-sort-numeric-up-alt' : 'bi bi-sort-alpha-up'"></i>
     <span class="small-text" style="display: block;">{{ sorting === 'size' ? 'Size' : sorting === 'number_genes' ? 'Genes' : 'Name' }}</span>

   </button>

  <button id='button_selection'  @click="$emit('toggle-mode')" style="padding: 6px" class="btn btn-outline-dark  me-2">

    <i class="bi bi-hand-index"></i>
    <span class="small-text" style="display: block;">{{ mode === 'zoom' ? 'Zoom' : 'Brush' }}</span>

  </button>

</div>

<div id="toggleDiv" class="collapse text-center" style="margin:24px; padding: 50px; border: #dddddd 1px solid">
  <b>Place holder for filtering widget.</b>
</div>

  <br>

</template>

<script>
export default {
  name: 'SettingsUI',
  props: {
    mode: String,
    sorting: String,
    type: String,
  },
  emits: ['toggle-mode', 'toggle-sorting', 'toggle-type']
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
.small-text {
  font-size: 10px;
}
</style>
