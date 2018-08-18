<template>
  <div>
    <lab-support></lab-support>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import LabSupport from '~/components/LabSupport'

@Component({
  components: {
    'lab-support': LabSupport,
  },
})

export default class LabSupportPage extends Vue {

}
</script>
