<template>
 <div class="d-flex justify-content-end">

  <button class="btn btn-outline-dark me-2" >
    <i class="bi bi-search"></i>
  </button>

  <button class="btn btn-outline-dark me-2">
    <i class="bi bi-pencil"></i>
  </button>

  <button class="btn btn-outline-dark me-2" data-bs-toggle="collapse" data-bs-target="#toggleDiv">
    <i class="bi bi-funnel"></i>
  </button>

  <button class="btn btn-outline-dark">
    <i class="bi bi-hand-index"></i>
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
    msg: String
  }
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
</style>
