<template>
  <div>
    <groupadmin></groupadmin>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import GroupAdmin from '~/components/GroupAdmin'
import axios from 'axios'

@Component({
  components: {
    groupadmin: GroupAdmin,
  },
})
export default class GroupAdminPage extends Vue {

}
</script>
