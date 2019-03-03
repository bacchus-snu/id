<template>
  <div>
    <h1 class="groupAdministration">{{ groupAdministrationTrans[lang] }}</h1>
    <el-row>
      <el-col :md="{span: 8, offset: 8}" :sm="{span: 24, offset: 0}" :xs="{span: 24, offset: 0}">
        <el-table :data="groupList" height="250" style="width: 100%">
          <el-table-column prop="name" label="Group Name" width="180"></el-table-column>
          <el-table-column label="Status" width="180">
            <template slot-scope="slotProps">
              <el-button
                v-if="slotProps.row.is_pending"
                disabled
                size="mini"
                @click="applyGroup(slotProps.row.idx)"
              >Pending</el-button>
              <el-button
                v-else-if="slotProps.row.is_member"
                size="mini"
                type="danger"
                @click="leaveGroup(slotProps.row.idx)"
              >Leave</el-button>
              <el-button v-else size="mini" @click="applyGroup(slotProps.row.idx)">Apply</el-button>
            </template>
          </el-table-column>
          <el-table-column label="Ownership" width="180">
            <template slot-scope="slotProps">
              <el-button
                v-if="slotProps.row.is_owner"
                size="mini"
                @click="GroupOwnership(slotProps.row.idx)"
              >GroupAdministration</el-button>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="Description"></el-table-column>
        </el-table>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Provide } from "nuxt-property-decorator";
import axios from "axios";
import { Translation, Language } from "../types/translation";

@Component({})
export default class Group extends Vue {
  private groupList;

  private readonly groupAdministrationTrans: Translation = {
    ko: "그룹관리",
    en: "Group Administration"
  };

  private readonly attributeGroupTrans: Translation = {
    ko: "그룹명",
    en: "Group Name"
  };

  private readonly attributeStatusTrans: Translation = {
    ko: "상태",
    en: "status"
  };

  private readonly attributeExplanationTrans: Translation = {
    ko: "설명",
    en: "Explanation"
  };

  private readonly applyFailedTrans: Translation = {
    ko: "신청에 실패했습니다.",
    en: "Apply failed."
  };

  private readonly leaveFailedTrans: Translation = {
    ko: "탈퇴에 실패했습니다.",
    en: "Leave failed"
  };

  get lang(): Language {
    return this.$store.state.language;
  }

  private async mounted() {
    const response = await axios.get("/api/check-login", {
      validateStatus: () => true
    });

    if (response.status !== 200) {
      this.$router.push("/");
    }

    const groupResponse = await axios.get("/api/group", {
      validateStatus: () => true
    });

    this.groupList = groupResponse.data
  }

  private async applyGroup(idx: number) {
    const response = await axios.post("/api/group/" + idx + "/apply");
    if (response.status === 200) {
      this.$router.push("/group");
    } else {
      this.$notify.error(this.applyFailedTrans[this.lang]);
      return;
    }
  }

  private async leaveGroup(idx: number) {
    const response = await axios.post("/api/group/" + idx + "/leave");
    if (response.status === 200) {
      this.$router.push("/group");
    } else {
      this.$notify.error(this.leaveFailedTrans[this.lang]);
      return;
    }
  }

  private async GroupOwnerShip(idx: number) {
    this.$router.push("/group/" + idx);
  }

  data() {
    return {
      groupList: this.groupList
    };
  }
}
</script>

<style scoped>
.groupAdministration {
  font-size: 32px;
  font-weight: 500;
  line-height: 40px;
  text-align: center;
  margin-top: 4%;
}
</style>
