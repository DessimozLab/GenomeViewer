<template>
  <div class="dropdown">
    <button :id="id" class="btn btn-outline-dark me-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
      <i :class="icon"></i>
      <span :style="spanStyle">{{ text }} <i class="bi bi-caret-down"></i></span>

      <span v-if="isValueSelected && !no_indicator"  class=" indicator_changed badge bg-danger position-absolute top-0  translate-middle p-1 border border-light rounded-circle">
        <span class="visually-hidden">New alerts</span>
      </span>

    </button>
    <ul class="dropdown-menu scrollable-dropdown" :aria-labelledby="id">
      <li v-for="(option, index) in option_w_null" :key="index" class="dropdown-item">
        <input type="radio" :id="id + index" :value="option" :checked="modelValue === option" @change="$emit('update:modelValue', option)">
        <label :for="id + index">&nbsp;{{ option == null ? 'Default' : option }}</label>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'DropdownButton',
  props: {
    id: String,
    icon: String,
    text: String,
    no_default: {
      type: Boolean,
      default: false,
    },
    no_indicator: {
      type: Boolean,
      default: false,
    },
    for_edge: {
      type: Boolean,
      default: false,
    },
    options: Array,
    modelValue: [String, Number, Boolean, Object],
    spanStyle: {
      type: String,
      default: 'font-size: 10px;display: block;',
    },
  },
  computed: {
    option_w_null() {
      // if for edge remove all options that finish with _edge
      if (this.no_default) {
        if (this.for_edge) {
          return this.options.filter((option) => {
            option.endsWith('_edge')
          } );
        }
        return this.options;
      }
      if (this.for_edge) {
        var f = this.options.filter((option) => {
          return option.endsWith('_edge')
        });
        return [null, ...f];
      }
      return [null, ...this.options];
    },
    isValueSelected() {
      return this.modelValue !== null;
    },
  },
  emits: ['update:modelValue', 'change'],
};
</script>


<style scoped>

.indicator_changed {
  left: 88%;
}

.scrollable-dropdown {
  max-height: 400px; /* Set the maximum height */
  overflow-y: auto; /* Enable vertical scrolling */
}

</style>
