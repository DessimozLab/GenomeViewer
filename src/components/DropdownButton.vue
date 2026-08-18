<template>
  <div class="dropdown">
    <button :id="id" :class="buttonClasses" type="button" data-bs-toggle="dropdown" aria-expanded="false">
      <i v-if="icon" :class="icon"></i>
      <span :style="spanStyle">{{ text }} <i class="bi bi-caret-down"></i></span>

      <span v-if="isValueSelected && !no_indicator"  class=" indicator_changed badge bg-danger position-absolute top-0  translate-middle p-1 border border-light rounded-circle">
        <span class="visually-hidden">New alerts</span>
      </span>

    </button>
    <ul class="dropdown-menu scrollable-dropdown" :aria-labelledby="id">
      <li v-for="(option, index) in option_w_null" :key="index" class="dropdown-item">
        <input type="radio" :id="id + index" :value="option" :checked="modelValue === option" @change="$emit('update:modelValue', option)">
        <label :for="id + index">&nbsp;{{ optionLabel(option) }}</label>
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
    metric_meta: {
      type: Object,
      default: () => ({}),
    },
    modelValue: [String, Number, Boolean, Object],
    spanStyle: {
      type: String,
      default: 'font-size: 10px;display: block;',
    },
    variant: {
      type: String,
      default: 'button', // 'button' | 'text'
    },
  },
  computed: {
    buttonClasses() {
      return this.variant === 'text' ? 'btn btn-link text-dark p-0 dropdown-text-toggle' : 'btn btn-outline-dark me-2';
    },
    option_w_null() {
      // edge dropdowns only show '_edge' metrics, non-edge dropdowns only show non-'_edge' metrics
      const filtered = this.for_edge
          ? this.options.filter((option) => option.endsWith('_edge'))
          : this.options.filter((option) => !option.endsWith('_edge'));
      if (this.no_default) {
        return filtered;
      }
      return [null, ...filtered];
    },
    isValueSelected() {
      return this.modelValue !== null;
    },
  },
  methods: {
    // metric_meta is keyed by the exact field name (e.g. 'age_edge' is configured independently
    // of any gene-level 'age'); both label and unit are optional and fall back to the raw key
    optionLabel(option) {
      if (option == null) {
        return 'No scale';
      }
      const meta = this.metric_meta[option];
      if (!meta) {
        return option;
      }
      const label = meta.label || option;
      return meta.unit ? `${label} [${meta.unit}]` : label;
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

.dropdown-text-toggle {
  text-decoration: none;
  font-weight: 600;
}

.dropdown-text-toggle:hover {
  text-decoration: underline;
}

</style>
