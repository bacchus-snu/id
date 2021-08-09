<template>
  <div>
    <group></group>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import Group from '~/components/Group'

@Component({
  components: {
    group: Group,
  },
})
export default class GroupPage extends Vue {

}
</script>
