import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ProjectRole } from "@/models/responses/projectResponses";
import { projectSummary } from "@/test/projectFixtures";
import { renderWithStore } from "@/test/renderWithStore";
import { ProjectCard } from "./projectCard";

const renderCard = (role: ProjectRole) =>
  renderWithStore(<ProjectCard project={projectSummary("p1", { me: { role } })} today="2026-11-23" pinnedCount={0} />);

describe("ProjectCard: my role", () => {
  it.each([
    ["OWNER", "Owner"],
    ["MANAGER", "Manager"],
    ["MEMBER", "Member"],
  ] as const)("%s shows the %s badge", (role, text) => {
    renderCard(role);
    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
