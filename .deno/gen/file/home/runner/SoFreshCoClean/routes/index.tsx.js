/** @jsx h */ import { h } from "preact";
import { tw } from "@twind";
import Counter from "../islands/Counter.tsx";
export default function Home() {
    return /*#__PURE__*/ h("div", {
        class: tw`p-4 mx-auto max-w-screen-md`
    }, /*#__PURE__*/ h("img", {
        src: "/logo.svg",
        height: "100px",
        alt: "the fresh logo: a sliced lemon dripping with juice"
    }), /*#__PURE__*/ h("p", {
        class: tw`my-6`
    }, "Welcome to `fresh`. Try updating this message in the ./routes/index.tsx file, and refresh."), /*#__PURE__*/ h(Counter, {
        start: 3
    }));
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vaG9tZS9ydW5uZXIvU29GcmVzaENvQ2xlYW4vcm91dGVzL2luZGV4LnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiogQGpzeCBoICovXG5pbXBvcnQgeyBoIH0gZnJvbSBcInByZWFjdFwiO1xuaW1wb3J0IHsgdHcgfSBmcm9tIFwiQHR3aW5kXCI7XG5pbXBvcnQgQ291bnRlciBmcm9tIFwiLi4vaXNsYW5kcy9Db3VudGVyLnRzeFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBIb21lKCkge1xuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3M9e3R3YHAtNCBteC1hdXRvIG1heC13LXNjcmVlbi1tZGB9PlxuICAgICAgPGltZ1xuICAgICAgICBzcmM9XCIvbG9nby5zdmdcIlxuICAgICAgICBoZWlnaHQ9XCIxMDBweFwiXG4gICAgICAgIGFsdD1cInRoZSBmcmVzaCBsb2dvOiBhIHNsaWNlZCBsZW1vbiBkcmlwcGluZyB3aXRoIGp1aWNlXCJcbiAgICAgIC8+XG4gICAgICA8cCBjbGFzcz17dHdgbXktNmB9PlxuICAgICAgICBXZWxjb21lIHRvIGBmcmVzaGAuIFRyeSB1cGRhdGluZyB0aGlzIG1lc3NhZ2UgaW4gdGhlIC4vcm91dGVzL2luZGV4LnRzeFxuICAgICAgICBmaWxlLCBhbmQgcmVmcmVzaC5cbiAgICAgIDwvcD5cbiAgICAgIDxDb3VudGVyIHN0YXJ0PXszfSAvPlxuICAgIDwvZGl2PlxuICApO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGFBQWEsQ0FDYixTQUFTLENBQUMsUUFBUSxRQUFRLENBQUM7QUFDM0IsU0FBUyxFQUFFLFFBQVEsUUFBUSxDQUFDO0FBQzVCLE9BQU8sT0FBTyxNQUFNLHdCQUF3QixDQUFDO0FBRTdDLGVBQWUsU0FBUyxJQUFJLEdBQUc7SUFDN0IscUJBQ0UsQUFQSixDQUFhLENBT1IsS0FBRztRQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsMkJBQTJCLENBQUM7cUJBQ3pDLEFBUk4sQ0FBYSxDQVFOLEtBQUc7UUFDRixHQUFHLEVBQUMsV0FBVztRQUNmLE1BQU0sRUFBQyxPQUFPO1FBQ2QsR0FBRyxFQUFDLG9EQUFvRDtNQUN4RCxnQkFDRixBQWJOLENBQWEsQ0FhTixHQUFDO1FBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUM7T0FBRSw0RkFHcEIsQ0FBSSxnQkFDSixBQWpCTixDQUFhLENBaUJOLE9BQU87UUFBQyxLQUFLLEVBQUUsQ0FBQztNQUFJLENBQ2pCLENBQ047Q0FDSCxDQUFBIn0=