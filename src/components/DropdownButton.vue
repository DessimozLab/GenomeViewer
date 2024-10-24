<template>
  <div class="dropdown">
    <button :id="id" class="btn btn-outline-dark me-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
      <i :class="icon"></i>
      <span :style="spanStyle">{{ text }} <i class="bi bi-caret-down"></i></span>
    </button>
    <ul class="dropdown-menu" :aria-labelledby="id">
      <li v-for="(option, index) in options" :key="index" class="dropdown-item">
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
  emits: ['update:modelValue', 'change'],
};
</script>