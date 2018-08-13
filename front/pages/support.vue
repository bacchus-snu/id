<template>
  <div>
    <lab-support/>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import LabSupport from '~/components/LabSupport.vue'

@Component({
  components: {
    'lab-support': LabSupport,
  }
})

export default class support extends Vue {

}
</script>
