<template>
  <div>
    <the-heading></the-heading>
    <div>
      <nuxt/>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import TheHeading from '~/components/TheHeading.vue'

@Component({
  components: {
    'the-heading': TheHeading,
  }
})

export default class extends Vue {
  
}
</script>
