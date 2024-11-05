<template>
  <div class="dropdown">
    <button :id="id" class="btn btn-outline-dark me-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
      <i :class="icon"></i>
      <span :style="spanStyle">{{ text }} <i class="bi bi-caret-down"></i></span>

      <span v-if="isValueSelected"  class=" indicator_changed badge bg-danger position-absolute top-0  translate-middle p-1 border border-light rounded-circle">
        <span class="visually-hidden">New alerts</span>
      </span>

    </button>
    <ul class="dropdown-menu" :aria-labelledby="id">
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
    options: Array,
    modelValue: [String, Number, Boolean, Object],
    spanStyle: {
      type: String,
      default: 'font-size: 10px;display: block;',
    },
  },
  computed: {
    option_w_null() {
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


</style>
