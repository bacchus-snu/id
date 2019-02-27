<template>
  <div>
    <el-container direction="vertical">
      <el-card class="title">{{ groupAdministrationTrans[lang] }}</el-card>
      <el-card style="margin-top: 4%" :md="{span: 8, offset: 8}" :sm="{span: 8, offset: 8}" :xs="{span: 8, offset: 8}">
        <el-container>
          <el-header class="smalltitle" align="center">{{ additionTitleTrans[lang] }}</el-header>
          <el-main>
            <el-table
              style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
              :data="userList"
              border
              striped
              align="center"
            >
              <el-table-column type="selection" width="50"></el-table-column>
              <el-table-column type="index"></el-table-column>
              <el-table-column prop="studentNumber" width="180" label="Student Number"></el-table-column>
              <el-table-column prop="name" label="Name"></el-table-column>
            </el-table>
          </el-main>
          <el-footer style="margin-top: 20px" align="center">
            <el-button @click="permit">{{ additionTrans[lang] }}</el-button>
          </el-footer>
        </el-container>
      </el-card>
      <el-card style="margin-top: 4%" :md="{span: 8, offset: 8}" :sm="{span: 8, offset: 8}" :xs="{span: 8, offset: 8}">
        <el-container>
          <el-header class="smalltitle" align="center">{{ excludeTitleTrans[lang] }}</el-header>
          <el-main>
            <el-table
              style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
              :data="userList2"
              border
              align="center"
            >
              <el-table-column type="selection" width="50"></el-table-column>
              <el-table-column type="index"></el-table-column>
              <el-table-column prop="studentNumber" width="180" label="Student Number"></el-table-column>
              <el-table-column prop="name" label="Name"></el-table-column>
            </el-table>
          </el-main>
          <el-footer style="margin-top: 20px" align="center">
            <el-button @click="exclude">{{ excludeTrans[lang] }}</el-button>
          </el-footer>
        </el-container>
      </el-card>
    </el-container>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Provide } from "nuxt-property-decorator";
import axios from "axios";
import { Translation, Language } from "../types/translation";
import { UserGroup } from "../types/user";

@Component({})
export default class GroupAdmin extends Vue {
  private UserList;
  private UserList2;

  private readonly groupAdministrationTrans: Translation = {
    ko: "그룹관리",
    en: "Group Administration"
  };

  private readonly attributeGroupTrans: Translation = {
    ko: "그룹이름",
    en: "Group Name"
  };

  private readonly additionTitleTrans: Translation = {
    ko: "그룹 멤버 추가",
    en: "Add Members"
  };

  private readonly excludeTitleTrans: Translation = {
    ko: "그룹 멤버 제외",
    en: "Exclude Members"
  };

  private readonly additionTrans: Translation = {
    ko: "승인",
    en: "Add"
  };

  private readonly excludeTrans: Translation = {
    ko: "제외",
    en: "Exclude"
  };

  private readonly attributeStatusTrans: Translation = {
    ko: "상태",
    en: "status"
  };

  private readonly permissionFailedTrans: Translation = {
    ko: "그룹 멤버 추가에 실패했습니다.",
    en: "Failed to add a group member."
  };

  private readonly expelFailedTrans: Translation = {
    ko: "그룹 멤버 제외에 실패했습니다.",
    en: "Failed to exclude a group member."
  };

  get lang(): Language {
    return this.$store.state.language;
  }

  private async mounted() {
    const gid = this.$route.params.gid;

    let response = await axios.get("/api/check-login", {
      validateStatus: () => true
    });

    if (response.status === 200) {
      return;
    } else {
      this.$router.push("/");
    }

    response = await axios.post(
      "/api/check-ownership",
      { groupID: gid },
      { validateStatus: () => true }
    );

    if (response.status !== 200) {
      this.$router.push("/my-page");
    }

    this.UserList = await axios.get("/api/get-group-user", {
      validateStatus: () => true
    });
  }

  private async permit(list: UserGroup[]) {
    const response = await axios.post("/api/addMember", list, {
      validateStatus: () => true
    });
    if (response.status === 200) {
      this.$router.push("/groupAdmin");
    } else {
      this.$notify.error("Fail");
    }
  }

  private async exclude(list: UserGroup[]) {
    const response = await axios.post("/api/excludeMember", list, {
      validateStatus: () => true
    });

    if (response.status === 200) {
      this.$router.push("/groupAdmin");
    } else {
      this.$notify.error("Fail");
    }
  }

  data() {
    return {
      userList: [
        {
          studentNumber: "2019-10203",
          name: "Doge"
        },
        {
          studentNumber: "2019-10204",
          name: "Xrp"
        },
        {
          studentNumber: "2019-10205",
          name: "Btc"
        },
        {
          studentNumber: "2019-10206",
          name: "Eth"
        }
      ],
      userList2: [
        {
          studentNumber: "2019-10207",
          name: "A"
        },
        {
          studentNumber: "2019-10208",
          name: "B"
        },
        {
          studentNumber: "2019-10209",
          name: "C"
        },
        {
          studentNumber: "2019-10210",
          name: "D"
        }
      ]
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

.title {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  font-size: 32px;
  font-weight: 400;
  line-height: 60px;
  text-align: center;
  margin-top: 4%;
  background-color: orange;
  border-radius: 4px;
}

.main {
  text-align: center;
  margin-top: 4%;
  background-color: rgb(203, 255, 172);
}

.smalltitle {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  font-size: 24px;
  font-weight: 400;
  line-height: 65px;
  text-align: center;
  background-color: rgba(255, 255, 0, 0.5);
  border-radius: 4px;
}

.account {
  margin-top: 8%;
  text-align: center;
  vertical-align: middle;
  margin-right: 20px;
  margin-left: 20px;
}
</style>
