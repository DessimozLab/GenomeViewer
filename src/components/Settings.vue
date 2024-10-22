<template>
  <div id="main_container" class=" sticky-top">
 <div class="d-flex justify-content-end"  >

   <button id='button_type'  @click="$emit('toggle-type')" style="padding: 6px" class="btn btn-outline-dark  me-2">

     <i class="bi bi-rulers"></i>
     <span class="small-text" style="display: block;">{{ type === 'loci' ? 'Locus' : 'Fixed'}}</span>

   </button>

   <button class="btn btn-outline-dark me-2" data-bs-toggle="collapse"  style="padding: 6px" data-bs-target="#toggleDiv">
    <i class="bi bi-funnel"></i>
     <span class="small-text" style="display: block;">Filter</span>
  </button>


   <button id='button_hide'  @click="$emit('toggle-hide')" style="padding: 6px" class="btn btn-outline-dark  me-2">

     <i :class="hide ? 'bi bi-eye-slash' : 'bi bi-eye-fill'"></i>
     <span class="small-text" style="display: block;">Detail</span>

   </button>

   <button id='button_sorting'  @click="$emit('toggle-sorting')" style="padding: 6px" class="btn btn-outline-dark  me-2">

     <i :class="sorting === 'size' ? 'bi bi-sort-up' : sorting === 'number_genes' ? 'bi bi-sort-numeric-up-alt' : 'bi bi-sort-alpha-up'"></i>
     <span class="small-text" style="display: block;">{{ sorting === 'size' ? 'Size' : sorting === 'number_genes' ? 'Genes' : 'Name' }}</span>

   </button>

  <button id='button_selection'  @click="$emit('toggle-mode')" style="padding: 6px" class="btn btn-outline-dark  me-2">

    <i class="bi bi-hand-index"></i>
    <span class="small-text" style="display: block;">{{ mode === 'zoom' ? 'Zoom' : 'Brush' }}</span>

  </button>

   <div class="vr" style="margin-right: 24px;"><p class="vertical-text" >General</p></div>

   <div class="dropdown">
     <button id='button_color_overview' class=" btn btn-outline-dark me-2" type="button"  data-bs-toggle="dropdown" aria-expanded="false">
       <i class="bi bi-paint-bucket"></i>
       <span class="small-text" style="display: block;">Gene <i class="bi bi-caret-down"></i> </span>
     </button>
     <ul class="dropdown-menu" aria-labelledby="button_color_overview">
       <li v-for="(option, index) in settings.states_color_genes" :key="index" class="dropdown-item">

         <input type="radio" :id="'colorOption' + index" v-model="selectedColorOption" :value="option">

         <label :for="'colorOption' + index"> &nbsp; {{ option == null? ' Default' : ' ' + option }}</label>
       </li>
     </ul>
   </div>

   <div class="dropdown">
     <button id='button_height_overview' class=" btn btn-outline-dark me-2" type="button"  data-bs-toggle="dropdown" aria-expanded="false">
       <i class="bi bi-arrows-vertical"></i>
       <span class="small-text" style="display: block;">Height <i class="bi bi-caret-down"></i> </span>
     </button>
     <ul class="dropdown-menu" aria-labelledby="button_height_overview">
       <li v-for="(option, index) in settings.states_color_genes" :key="index" class="dropdown-item">

         <input type="radio" :id="'heightOption' + index" v-model="selectedHeightOption" :value="option">

         <label :for="'heightOption' + index"> &nbsp; {{ option == null? ' Default' : ' ' + option }}</label>
       </li>
     </ul>
   </div>


   <div class="vr" style="margin-right: 24px;"><p class="vertical-text">Overview</p></div>



   <button id='button_color_excerpt' style="padding: 6px" class="btn btn-outline-dark  me-2">

     <i class="bi bi-paint-bucket"></i>
     <span class="small-text" style="display: block;">{{ colorAccessor_overview === null ? 'Default' : colorAccessor_overview  }}</span>

   </button>

   <button id='button_height_excerpt'  style="padding: 6px" class="btn btn-outline-dark  me-2">
     <i class="bi bi-arrows-vertical"></i>
     <span class="small-text" style="display: block;">{{ colorAccessor_overview === null ? 'Default' : colorAccessor_overview  }}</span>
   </button>

   <div class="vr" style="margin-right: 24px;"><p class="vertical-text">Excerpt</p></div>






 </div>

<div id="toggleDiv" class="collapse text-center" style="margin:24px; padding: 50px; border: #dddddd 1px solid">
  <b>Place holder for filtering widget.</b>
</div>

  <br>

  </div>

</template>

<script>
export default {
  name: 'SettingsUI',
  props: {
    mode: String,
    sorting: String,
    type: String,
    hide: Boolean,
    colorAccessor_overview: String,
    settings: Object,
  },
  data() {
    return {
      dropdownVisible: false,
      selectedColorOption: null,
      selectedHeightOption: null,
    };
  },
  methods: {
    toggleColorOverview() {
      this.$emit('update-color-overview', this.selectedColorOption);
    },
    toggleColorHeight() {
      this.$emit('update-height-overview', this.selectedHeightOption);
    }
  },
  watch: {
    selectedColorOption() {
      this.toggleColorOverview();
    },
    selectedHeightOption() {
      this.toggleColorHeight();
    }
  },
  emits: ['toggle-mode', 'toggle-sorting', 'toggle-type', 'toggle-hide', "toggle-color_overview",'update-color-overview', 'update-height-overview'],
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

#main_container{
  z-index: 1000;
  background-color: white;
  padding: 12px;
}
.vertical-text {
  transform: rotate(-90deg);
  font-size: xx-small;
  display: flex;
  margin-left: 10px;
  justify-content: right;

}
/* Add styles for the dropdown menu */
.dropdown-menu {
  position: absolute;
  background-color: white;
  border: 1px solid #ccc;
  padding: 10px;
  z-index: 1000;
}

</style>
