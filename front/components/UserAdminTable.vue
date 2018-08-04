<template>
  <div>
    <el-card>
      <el-table
        empty-text="No Data">

      </el-table>
    </el-card>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import axios from 'axios'
import { AxiosResponse } from 'axios'

@Component({})
export default class UserAdminTable extends Vue {

  async mounted(): Promise<void> {
    let response = await axios.get('/api/user')
    console.log(response.data)
  }

}
</script>
