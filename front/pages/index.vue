<template>
  <section>
    <div>
      <test-component></test-component>
    </div>
  </section>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator';
import TestComponent from '~/components/TestComponent.vue';

@Component({
  components: {
    'test-component': TestComponent,
  }
})
export default class extends Vue {

}
</script>
