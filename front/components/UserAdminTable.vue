<template>
  <div>
    <el-card>
      <el-table
        :data="userData"
        empty-text="No Data">
        <el-table-column
          v-for="col in fields"
          :prop="col"
          :label="col"
          :key="col">
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import axios from 'axios'
import { AxiosResponse } from 'axios'
import { User, userFields } from '~/types/User'

@Component({})
export default class UserAdminTable extends Vue {
  public userData: Array<User> = []
  public fields: Array<string> = userFields

  async mounted(): Promise<void> {
    let response = await axios.get('/api/user')
    this.userData = response.data
  }

}
</script>
