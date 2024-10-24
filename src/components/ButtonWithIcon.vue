<template>
  <button :id="id" @click="click" :class="buttonClass" :style="buttonStyle">
    <i :class="icon"></i>
    <span :style="spanStyle">{{ text }}</span>
  </button>
</template>

<script>
export default {
  name: 'ButtonWithIcon',
  props: {
    id: String,
    icon: String,
    text: String,
    click: Function,
    buttonClass: {
      type: String,
      default: 'btn btn-outline-dark me-2',
    },
    buttonStyle: {
      type: String,
      default: 'padding: 6px',
    },
    spanStyle: {
      type: String,
      default: 'font-size: 10px;display: block;',
    },
  },
};
</script>
