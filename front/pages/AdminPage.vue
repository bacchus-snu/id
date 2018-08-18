<template>
  <div>
    <user-admin-table></user-admin-table>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import UserAdminTable from '~/components/UserAdminTable.vue'

@Component({
  components: {
    'user-admin-table': UserAdminTable,
  },
})

export default class AdminPage extends Vue {

}
</script>
