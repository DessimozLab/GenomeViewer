<template>
  <div class="modal" tabindex="-1" style="display: block;">
    <div class="modal-dialog modal-lg ">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Selected Genes</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <table class="table">
            <thead>
            <tr>
              <th>Gene ID</th>
              <th>Start</th>
              <th>End</th>
              <th>Data</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="gene in selectedGenes" :key="gene.id">
              <td>{{ gene.id }}</td>
              <td>{{ gene.start }}</td>
              <td>{{ gene.end }}</td>
              <td>{{ gene.data }}</td>
            </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SelectedGenesModal',
  props: {
    selectedGenes: Array
  },
  created() {
    console.log(this.selectedGenes)
  },
};
</script>

<style scoped>
.modal {
  background-color: rgba(0, 0, 0, 0.5);
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>