import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const review = await prisma.review.findUnique({
      where: { id }
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Ensure the review belongs to the user
    if (review.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(review, { status: 200 });
  } catch (error) {
    console.error("Fetch Review Error:", error);
    return NextResponse.json({ error: "Failed to fetch review details" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // First check if it exists and belongs to the user
    const review = await prisma.review.findUnique({
      where: { id }
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete it
    await prisma.review.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Review deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Delete Review Error:", error);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}
