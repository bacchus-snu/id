<template>
  <div>
    <app-center></app-center>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import AppCenter from '~/components/AppCenter.vue'

@Component({
  components: {
    'app-center': AppCenter,
  },
})

export default class AppCenterPage extends Vue {

}
</script>
