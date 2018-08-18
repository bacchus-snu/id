<template>
  <div>
    <service-info></service-info>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import ServiceInfo from '~/components/ServiceInfo.vue'

@Component({
  components: {
    'service-info': ServiceInfo,
  },
})

export default class HelpPage extends Vue {

}
</script>
