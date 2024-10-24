<template>
  <div class="vr" style="margin-right: 24px;">
    <p class="vertical-text">{{ text }}</p>
  </div>
</template>

<script>
export default {
  name: 'VerticalTextDivider',
  props: {
    text: String,
  },
};
</script>

<style scoped>
.vertical-text {
  transform: rotate(-90deg);
  font-size: xx-small;
  display: flex;
  margin-left: 10px;
  justify-content: right;
}
</style>