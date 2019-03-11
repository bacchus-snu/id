<template>
  <div>
    <group></group>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import Group from '~/components/Group'
import axios from 'axios'

@Component({
  components: {
    group: Group,
  },
})
export default class GroupPage extends Vue {

}
</script>
