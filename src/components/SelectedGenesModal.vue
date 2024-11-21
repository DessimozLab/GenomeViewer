<template>
  <div class="modal" tabindex="-1" style="display: block;">
    <div class="modal-dialog modal-xl ">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Selected Genes</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>



    <div class="modal-body">

      <ButtonWithIcon
          buttonStyle="margin: 24px;"
          id="goenchrichment"
          icon="null"
          text="Run go enchrichment analysis"
          @click="this.runGoEnrichment"
          v-if="this.settings.oma"
      />



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
import ButtonWithIcon from "@/components/ButtonWithIcon";

export default {
name: 'SelectedGenesModal',
components: {
ButtonWithIcon,
},
props: {
selectedGenes: Array,
settings : Object,
},
methods: {
  runGoEnrichment() {

    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };


    // DEVVVVV

    var input_foreground = this.selectedGenes.map(gene => gene.id).filter(n=>n);
    var ts = new Date().toLocaleDateString(undefined, options);

    fetch("/api/enrichment/", {
      method: "POST",
      body: JSON.stringify({
        foreground: input_foreground,
        type: this.settings.type_chromosome,
        name: 'ChromosomeViewer_' + this.settings.type_chromosome + '_' +  ts,
        taxlevel: this.settings.level ,
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      }
    })
        .then((response) => response.json())
        .then((json) =>  {


          if (json.id !== undefined){

            window.open(`/oma/go_enrichment_result/${json.id}/` , "_self")

          } else {
            let msg = "\n".concat(Object.keys(json));
            alert("The provided data contains errors:\n" + msg);
          }
        });



  }
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