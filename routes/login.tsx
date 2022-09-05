/** @jsx h */
import { h } from "preact";
import { tw } from "@twind";
import { OAuth2Client } from "oauth2";
import Counter from "../islands/Counter.tsx";

export default function Home() {
  return (
    <div class={tw`p-4 mx-auto max-w-screen-md`}>
      <img
        src="/logo.svg"
        height="100px"
        alt="the fresh logo: a sliced lemon dripping with juice"
      />
      <p class={tw`my-6`}>
        TODO: Login to Auth0
      </p>
    </div>
  );
}
